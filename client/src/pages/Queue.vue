<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { api } from '../api.js'
import { useSSE } from '../sse.js'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import KeyValue from '../ui/components/KeyValue.vue'
import ScrollArea from '../ui/components/ScrollArea.vue'
import Badge from '../ui/components/Badge.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import Tabs from '../ui/components/Tabs.vue'
import FilterChip from '../ui/components/FilterChip.vue'

const snapshot = ref({})
const queues = ref([])
const selected = ref(null)
const history = ref([])
const events = useSSE()
const now = ref(Date.now())
const eventFilter = ref({ complete: true, failed: true, retry: true, new: false, drain: false })
const groupFocus = ref(null)
const expanded = ref(new Set())

function toggleExpand(key) {
  if (expanded.value.has(key)) expanded.value.delete(key)
  else expanded.value.add(key)
  expanded.value = new Set(expanded.value)
}

function formatPayload(payload) {
  if (payload === undefined) return '(no payload)'
  try { return JSON.stringify(payload, null, 2) } catch { return String(payload) }
}

let pollTimer = null
let historyTimer = null
let tickTimer = null

async function fetchConfig() {
  const res = await fetch(api('/config'))
  if (!res.ok) return
  const cfg = await res.json()
  queues.value = cfg.queue ?? []
  if (!selected.value || !queues.value.includes(selected.value)) {
    selected.value = queues.value[0] ?? null
  }
}

async function pollSnapshot() {
  if (!selected.value) return
  try {
    const res = await fetch(api(`/queue/${encodeURIComponent(selected.value)}?payload=1`))
    if (res.ok) snapshot.value = await res.json()
  } catch {}
}

async function pollHistory() {
  if (!selected.value) return
  try {
    const res = await fetch(api(`/queue/${encodeURIComponent(selected.value)}/history`))
    if (res.ok) {
      const data = await res.json()
      history.value = data.entries ?? []
    }
  } catch {}
}

onMounted(async () => {
  await fetchConfig()
  await pollSnapshot()
  await pollHistory()
  pollTimer = setInterval(pollSnapshot, 1000)
  historyTimer = setInterval(pollHistory, 1500)
  tickTimer = setInterval(() => { now.value = Date.now() }, 500)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (historyTimer) clearInterval(historyTimer)
  if (tickTimer) clearInterval(tickTimer)
})

watch(selected, async () => {
  snapshot.value = {}
  history.value = []
  groupFocus.value = null
  await pollSnapshot()
  await pollHistory()
})

const queueTabs = computed(() =>
  queues.value.map((name) => ({ value: name, label: name }))
)

const opts = computed(() => snapshot.value.options ?? {})

const stats = computed(() => {
  const s = snapshot.value
  return {
    inFlight: s.inFlight ?? 0,
    depth: (s.defaultDepth ?? 0) + (s.groups ?? []).reduce((sum, g) => sum + g.depth, 0),
    defaultDepth: s.defaultDepth ?? 0,
    pushed: s.pushed ?? 0,
    settled: s.settled ?? 0,
  }
})

const sessionCounts = computed(() => {
  const out = { complete: 0, failed: 0, retry: 0 }
  for (const e of history.value) {
    if (e.kind in out) out[e.kind]++
  }
  return out
})

const groupsView = computed(() => {
  const rows = []
  const s = snapshot.value
  if (!s.options) return rows

  // synthetic "default" row representing ungrouped work
  const defaultInFlight = s.defaultInFlight ?? 0
  const defaultDepth = s.defaultDepth ?? 0
  const defaultWorkers = s.workers?.default ?? 0
  if (defaultInFlight > 0 || defaultDepth > 0 || defaultWorkers > 0) {
    rows.push({
      name: '(default)',
      isDefault: true,
      inFlight: defaultInFlight,
      depth: defaultDepth,
      workers: defaultWorkers,
    })
  }

  for (const g of s.groups ?? []) {
    rows.push({
      name: g.name,
      isDefault: false,
      inFlight: g.inFlight,
      depth: g.depth,
      workers: g.workers,
    })
  }
  return rows
})

function selectGroup(row) {
  if (groupFocus.value === row.name) groupFocus.value = null
  else groupFocus.value = row.name
}

const filteredHistory = computed(() => {
  return history.value.filter((e) => {
    if (!eventFilter.value[e.kind]) return false
    if (groupFocus.value) {
      const taskGroup = e.task?.group ?? null
      if (groupFocus.value === '(default)') {
        if (taskGroup !== null) return false
      } else if (taskGroup !== groupFocus.value) {
        return false
      }
    }
    return true
  })
})

const liveTasks = computed(() => {
  const tasks = snapshot.value.inFlightTasks ?? []
  if (!groupFocus.value) return tasks
  if (groupFocus.value === '(default)') return tasks.filter((t) => !t.group)
  return tasks.filter((t) => t.group === groupFocus.value)
})

const queueEvents = computed(() =>
  events.value
    .filter((e) => e.type.startsWith('queue:') && e.data?.queue === selected.value)
    .slice(0, 200)
)

function elapsed(ts) {
  const d = now.value - ts
  if (d < 1000) return `${d}ms`
  if (d < 60_000) return `${(d / 1000).toFixed(1)}s`
  return `${Math.floor(d / 60_000)}m ${Math.floor((d % 60_000) / 1000)}s`
}

function fmtDuration(ms) {
  if (ms == null) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function fmtMs(value) {
  if (!value) return '-'
  if (value < 1000) return `${value}ms`
  if (value < 60_000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}s`
  return `${Math.floor(value / 60_000)}m`
}

const statusItems = computed(() => [
  { label: 'In-flight', value: stats.value.inFlight },
  { label: 'Queued', value: stats.value.depth },
  { label: 'Completed', value: sessionCounts.value.complete },
  { label: 'Failed', value: sessionCounts.value.failed, tone: sessionCounts.value.failed ? 'failed' : null },
  { label: 'Retried', value: sessionCounts.value.retry, tone: sessionCounts.value.retry ? 'paused' : null },
])

const configItems = computed(() => [
  { label: 'Concurrency', value: opts.value.concurrency ?? '-' },
  { label: 'Global concurrency', value: opts.value.globalConcurrency || 'disabled' },
  { label: 'Timeout', value: fmtMs(opts.value.timeout) },
  { label: 'Delay', value: fmtMs(opts.value.delay) },
  { label: 'Max retries', value: opts.value.maxRetries ?? '-' },
  { label: 'Group concurrency', value: opts.value.groups?.concurrency ?? '-' },
])

const HISTORY_VARIANT = {
  complete: 'active',
  failed: 'failed',
  retry: 'warning',
}

const EVENT_VARIANT = {
  complete: 'active',
  failed: 'failed',
  retry: 'warning',
  new: 'default',
  drain: 'default',
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Job queue"
      title="Queue"
      subtitle="Per-queue state, groups, and recent tasks. Click a group to focus the live tasks and history."
    />

    <div v-if="!selected" class="page-body">
      <Panel><EmptyState title="No queue connected" /></Panel>
    </div>

    <div v-else class="page-body">
      <section v-if="queueTabs.length > 1" class="page-section">
        <div class="picker-row">
          <Tabs
            :model-value="selected"
            :tabs="queueTabs"
            variant="pills"
            @update:model-value="selected = $event"
          />
        </div>
      </section>

      <section class="page-section split">
        <Panel title="Status" description="Current activity and recent outcomes.">
          <div class="kv-pad">
            <KeyValue layout="divided" :items="statusItems">
              <template #value="{ item }">
                <span :style="item.tone === 'failed' ? 'color: var(--status-failed)' : item.tone === 'paused' ? 'color: var(--status-paused)' : ''">{{ item.value }}</span>
              </template>
            </KeyValue>
          </div>
        </Panel>

        <Panel title="Configuration" description="Limits and timings for this queue.">
          <div class="kv-pad">
            <KeyValue layout="divided" :items="configItems" />
          </div>
        </Panel>
      </section>

      <section class="page-section">
        <Panel title="Groups" description="Click a row to focus tasks and history below.">
          <div v-if="groupsView.length" class="groups">
            <div class="groups__head">
              <span>Group</span>
              <span class="num">In-flight</span>
              <span class="num">Queued</span>
              <span class="num">Workers</span>
            </div>
            <button
              v-for="row in groupsView"
              :key="row.name"
              type="button"
              :class="['groups__row', { 'groups__row--active': groupFocus === row.name }]"
              @click="selectGroup(row)"
            >
              <span class="groups__name">
                <Badge v-if="row.isDefault" variant="default" size="sm">default</Badge>
                <span v-else class="groups__group">{{ row.name }}</span>
              </span>
              <span class="num" :class="{ 'num--warn': row.inFlight > 0 }">{{ row.inFlight }}</span>
              <span class="num" :class="{ 'num--warn': row.depth > 0 }">{{ row.depth }}</span>
              <span class="num">{{ row.workers }}</span>
            </button>
          </div>
          <EmptyState v-else title="No active groups" description="Push a task with a group to see it here." />
        </Panel>
      </section>

      <section class="page-section">
        <Panel
          :title="`Live tasks${groupFocus ? ` - ${groupFocus}` : ''}`"
          :description="liveTasks.length ? 'Tasks currently in-flight on this instance.' : 'No tasks running right now.'"
        >
          <ScrollArea height="280px">
            <template v-if="liveTasks.length">
              <div v-for="task in liveTasks" :key="task.uuid" class="row-wrap">
                <button type="button" class="row row--task" @click="toggleExpand(`live:${task.uuid}`)">
                  <span class="row__caret">{{ expanded.has(`live:${task.uuid}`) ? '▾' : '▸' }}</span>
                  <span class="task__uuid">{{ task.uuid.slice(0, 8) }}</span>
                  <Badge v-if="task.group" variant="default" size="sm">{{ task.group }}</Badge>
                  <Badge v-else variant="default" size="sm">default</Badge>
                  <span class="task__worker">{{ task.workerId }}</span>
                  <span v-if="task.attempts > 1" class="task__attempts">attempt {{ task.attempts }}</span>
                  <span class="task__elapsed">{{ elapsed(task.startedAt) }}</span>
                </button>
                <pre v-if="expanded.has(`live:${task.uuid}`)" class="payload">{{ formatPayload(task.payload) }}</pre>
              </div>
            </template>
            <EmptyState v-else title="No tasks running" />
          </ScrollArea>
        </Panel>
      </section>

      <section class="page-section">
        <Panel
          :title="`Recent history${groupFocus ? ` - ${groupFocus}` : ''}`"
          :description="`Last ${history.length} completed, failed, and retried tasks.`"
        >
          <template #aside>
            <div class="filter-row">
              <FilterChip
                v-for="kind in ['complete', 'failed', 'retry']"
                :key="kind"
                :active="eventFilter[kind]"
                @click="eventFilter[kind] = !eventFilter[kind]"
              >{{ kind }} {{ sessionCounts[kind] }}</FilterChip>
            </div>
          </template>
          <ScrollArea max-height="480px">
            <template v-if="filteredHistory.length">
              <div v-for="(e, i) in filteredHistory" :key="`${e.task?.uuid ?? i}:${e.ts}`" class="row-wrap">
                <button type="button" class="row row--event" @click="toggleExpand(`hist:${e.task?.uuid ?? i}:${e.ts}`)">
                  <span class="row__caret">{{ expanded.has(`hist:${e.task?.uuid ?? i}:${e.ts}`) ? '▾' : '▸' }}</span>
                  <Badge :variant="HISTORY_VARIANT[e.kind]" size="sm">{{ e.kind }}</Badge>
                  <span class="event__uuid">{{ e.task?.uuid?.slice(0, 8) ?? '-' }}</span>
                  <Badge v-if="e.task?.group" variant="default" size="sm">{{ e.task.group }}</Badge>
                  <span v-if="e.kind === 'complete'" class="event__duration">{{ fmtDuration(e.durationMs) }}</span>
                  <span v-else-if="e.error" class="event__error">{{ e.error }}</span>
                  <span v-else-if="e.kind === 'retry'" class="event__attempt">attempt {{ e.attempt }}</span>
                  <span class="event__time">{{ new Date(e.ts).toLocaleTimeString() }}</span>
                </button>
                <pre v-if="expanded.has(`hist:${e.task?.uuid ?? i}:${e.ts}`)" class="payload">{{ formatPayload(e.task?.payload) }}</pre>
              </div>
            </template>
            <EmptyState v-else title="No matching tasks" />
          </ScrollArea>
        </Panel>
      </section>

      <section class="page-section">
        <Panel title="Live events" description="Raw event stream for this queue, newest first.">
          <ScrollArea max-height="320px">
            <template v-if="queueEvents.length">
              <div v-for="(evt, i) in queueEvents" :key="i" class="event">
                <Badge :variant="EVENT_VARIANT[evt.type.split(':')[1]] || 'default'" size="sm">
                  {{ evt.type.split(':')[1] }}
                </Badge>
                <span class="event__uuid">{{ evt.data?.task?.uuid?.slice(0, 8) ?? '-' }}</span>
                <Badge v-if="evt.data?.task?.group" variant="default" size="sm">{{ evt.data.task.group }}</Badge>
                <span class="event__time">{{ new Date(evt.ts).toLocaleTimeString() }}</span>
              </div>
            </template>
            <EmptyState v-else title="No events yet" />
          </ScrollArea>
        </Panel>
      </section>
    </div>
  </div>
</template>

<style scoped>
.picker-row {
  display: flex;
  align-items: center;
}

.kv-pad { padding: 4px 24px 16px; }

.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 880px) {
  .split { grid-template-columns: 1fr; }
}

.groups {
  display: flex;
  flex-direction: column;
}
.groups__head, .groups__row {
  display: grid;
  grid-template-columns: 1fr 80px 80px 80px;
  gap: 12px;
  padding: 10px 24px;
  align-items: center;
  font-size: 13px;
}
.groups__head {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-40);
  border-bottom: 1px solid var(--ink-08);
}
.groups__row {
  background: transparent;
  border: 0;
  border-top: 1px solid var(--ink-08);
  cursor: pointer;
  text-align: left;
  color: var(--ink);
  transition: background 0.1s;
}
.groups__row:first-of-type { border-top: 0; }
.groups__row:hover { background: var(--ink-04); }
.groups__row--active { background: var(--ink-08); }
.groups__name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.groups__group {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.num {
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--ink-60);
}
.num--warn { color: var(--ink); }

.filter-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.row-wrap { border-top: 1px solid var(--ink-08); }
.row-wrap:first-child { border-top: 0; }

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 24px;
  font-size: 13px;
  width: 100%;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  color: inherit;
  transition: background 0.1s;
}
.row:hover { background: var(--ink-04); }

.row__caret {
  font-size: 10px;
  color: var(--ink-40);
  width: 10px;
  flex-shrink: 0;
}

.payload {
  margin: 0;
  padding: 12px 24px 14px 50px;
  background: var(--ink-04);
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
  border-top: 1px dashed var(--ink-08);
}

.task__uuid, .event__uuid {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink-60);
  flex-shrink: 0;
}
.task__worker {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
  flex-shrink: 0;
}
.task__attempts {
  font-size: 12px;
  color: var(--status-paused);
  flex-shrink: 0;
}
.task__elapsed {
  flex: 1;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink-60);
}
.event__duration {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink-60);
  flex-shrink: 0;
}
.event__attempt {
  font-size: 12px;
  color: var(--status-paused);
  flex-shrink: 0;
}
.event__error {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--status-failed);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event__time {
  flex-shrink: 0;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--ink-40);
}
</style>
