<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { api } from '../api.js'
import { basePath } from '../base.js'
import PageHeader from '../ui/components/PageHeader.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import Badge from '../ui/components/Badge.vue'
import Button from '../ui/components/Button.vue'

const traces = ref([])
const selectedId = ref(null)
const detail = ref(null)
const selectedSpanId = ref(null)
const live = ref(true)
const searchId = ref('')
const filterStatus = ref('')
const filterService = ref('')
const loaded = ref(false)

let pollHandle = null
let sse = null

async function loadTraces() {
  try {
    const params = new URLSearchParams()
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterService.value) params.set('service', filterService.value)
    params.set('limit', '100')
    const res = await fetch(api(`/traces?${params}`))
    if (res.ok) {
      const data = await res.json()
      traces.value = data.traces
    }
  } catch {}
  loaded.value = true
}

async function loadDetail(id) {
  if (!id) { detail.value = null; return }
  try {
    const res = await fetch(api(`/traces/${id}`))
    if (res.ok) {
      detail.value = await res.json()
      selectedSpanId.value = detail.value.spans[0]?.spanId ?? null
    } else {
      detail.value = null
    }
  } catch {
    detail.value = null
  }
}

function selectTrace(id) {
  selectedId.value = id
  loadDetail(id)
}

function jumpToTrace() {
  const id = searchId.value.trim()
  if (!id) return
  selectTrace(id)
}

const allServices = computed(() => {
  const set = new Set()
  for (const t of traces.value) for (const s of t.services) set.add(s)
  return [...set].sort()
})

const selectedSpan = computed(() => {
  if (!detail.value || !selectedSpanId.value) return null
  return detail.value.spans.find((s) => s.spanId === selectedSpanId.value) ?? null
})

const waterfall = computed(() => {
  if (!detail.value) return { rows: [], totalDuration: 0, startedAt: 0 }
  const trace = detail.value
  const startedAt = trace.startedAt
  const totalDuration = Math.max(1, trace.endedAt - trace.startedAt)
  const byParent = new Map()
  for (const s of trace.spans) {
    const parent = s.parentSpanId ?? null
    if (!byParent.has(parent)) byParent.set(parent, [])
    byParent.get(parent).push(s)
  }
  for (const children of byParent.values()) {
    children.sort((a, b) => a.startedAt - b.startedAt)
  }
  const rows = []
  const walk = (parentId, depth) => {
    for (const span of byParent.get(parentId) ?? []) {
      const leftPct = ((span.startedAt - startedAt) / totalDuration) * 100
      const widthPct = Math.max(0.3, (span.durationMs / totalDuration) * 100)
      rows.push({ span, depth, leftPct, widthPct })
      walk(span.spanId, depth + 1)
    }
  }
  walk(null, 0)
  for (const span of trace.spans) {
    if (span.parentSpanId && !trace.spans.some((s) => s.spanId === span.parentSpanId)) {
      const leftPct = ((span.startedAt - startedAt) / totalDuration) * 100
      const widthPct = Math.max(0.3, (span.durationMs / totalDuration) * 100)
      if (!rows.some((r) => r.span.spanId === span.spanId)) {
        rows.push({ span, depth: 0, leftPct, widthPct })
      }
    }
  }
  return { rows, totalDuration, startedAt }
})

function subsystemFromName(name) {
  if (!name) return 'other'
  if (name.startsWith('queue.')) return 'queue'
  if (name.startsWith('cache.')) return 'cache'
  if (name.startsWith('workflow.')) return 'workflow'
  if (name.startsWith('cron.')) return 'cron'
  if (name.startsWith('cells.')) return 'cells'
  if (name.startsWith('lock.')) return 'lock'
  if (name.startsWith('limit.')) return 'limit'
  if (name.startsWith('realtime.')) return 'realtime'
  if (name.startsWith('http.') || /^[A-Z]+ /.test(name)) return 'http'
  return 'other'
}

function formatDur(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`
  if (ms < 1000) return `${ms.toFixed(1)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString(undefined, { hour12: false }) + '.' + String(ts % 1000).padStart(3, '0')
}

function age(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

onMounted(async () => {
  await loadTraces()
  pollHandle = setInterval(() => {
    if (live.value) loadTraces()
  }, 1500)

  sse = new EventSource(`${basePath}/api/events`)
  sse.addEventListener('trace:span', () => {
    if (live.value && selectedId.value) loadDetail(selectedId.value)
  })
})

onBeforeUnmount(() => {
  if (pollHandle) clearInterval(pollHandle)
  if (sse) sse.close()
})

watch([filterStatus, filterService], () => { loadTraces() })
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Distributed tracing"
      title="Traces"
      subtitle="Follow a single request across every subsystem. Each row is a span; the waterfall shows causality and time."
    >
      <template #actions>
        <div class="tr-actions">
          <input
            v-model="searchId"
            class="tr-search"
            placeholder="paste trace ID…"
            @keydown.enter="jumpToTrace"
          />
          <Button variant="ghost" size="sm" :class="{ 'tr-live': live }" @click="live = !live">
            {{ live ? '● live' : '○ paused' }}
          </Button>
        </div>
      </template>
    </PageHeader>

    <div class="page-body">
      <EmptyState
        v-if="loaded && !traces.length && !detail"
        title="No traces yet"
        description="Traces will appear here as requests flow through the system. If you haven't passed a tracer to prsmDevtools, traces won't show up."
      />

      <div v-else class="tr-layout">
        <aside class="tr-list">
          <div class="tr-filters">
            <select v-model="filterStatus">
              <option value="">all status</option>
              <option value="ok">ok</option>
              <option value="error">errors only</option>
            </select>
            <select v-model="filterService">
              <option value="">all services</option>
              <option v-for="s in allServices" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <ul class="tr-traces">
            <li
              v-for="t in traces"
              :key="t.traceId"
              :class="['tr-trace', { 'tr-trace--active': t.traceId === selectedId, 'tr-trace--error': t.status === 'error' }]"
              @click="selectTrace(t.traceId)"
            >
              <div class="tr-trace__top">
                <span class="tr-trace__name">{{ t.rootName ?? t.traceId.slice(0, 8) }}</span>
                <span class="tr-trace__dur">{{ formatDur(t.durationMs) }}</span>
              </div>
              <div class="tr-trace__meta">
                <span class="tr-trace__service">{{ t.rootService ?? '—' }}</span>
                <span class="tr-trace__sep">·</span>
                <span class="tr-trace__count">{{ t.spanCount }} span{{ t.spanCount === 1 ? '' : 's' }}</span>
                <span class="tr-trace__sep">·</span>
                <span class="tr-trace__age">{{ age(t.startedAt) }}</span>
              </div>
              <div class="tr-trace__id">{{ t.traceId }}</div>
            </li>
          </ul>
        </aside>

        <main class="tr-main">
          <EmptyState
            v-if="!detail"
            title="Select a trace"
            description="Pick a trace on the left to see its waterfall."
          />
          <template v-else>
            <div class="tr-header">
              <div>
                <h2 class="tr-header__name">{{ detail.rootName ?? detail.traceId.slice(0, 8) }}</h2>
                <code class="tr-header__id">{{ detail.traceId }}</code>
              </div>
              <dl class="tr-header__stats">
                <div><dt>Total</dt><dd>{{ formatDur(detail.durationMs) }}</dd></div>
                <div><dt>Spans</dt><dd>{{ detail.spanCount }}</dd></div>
                <div><dt>Services</dt><dd>{{ detail.services.length }}</dd></div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <Badge :variant="detail.status === 'error' ? 'failed' : 'active'" size="sm">{{ detail.status }}</Badge>
                  </dd>
                </div>
              </dl>
            </div>

            <div class="tr-waterfall">
              <div class="tr-waterfall__axis">
                <span>0</span>
                <span>{{ formatDur(detail.durationMs / 4) }}</span>
                <span>{{ formatDur(detail.durationMs / 2) }}</span>
                <span>{{ formatDur((detail.durationMs * 3) / 4) }}</span>
                <span>{{ formatDur(detail.durationMs) }}</span>
              </div>
              <div
                v-for="row in waterfall.rows"
                :key="row.span.spanId"
                :class="['tr-row', { 'tr-row--active': row.span.spanId === selectedSpanId, 'tr-row--error': row.span.status === 'error' }]"
                @click="selectedSpanId = row.span.spanId"
              >
                <div class="tr-row__label" :style="{ paddingLeft: `${row.depth * 16 + 12}px` }">
                  <span class="tr-row__name">{{ row.span.name }}</span>
                  <span class="tr-row__service">{{ row.span.service }}</span>
                </div>
                <div class="tr-row__track">
                  <div
                    :class="['tr-bar', `tr-bar--${subsystemFromName(row.span.name)}`]"
                    :style="{ left: `${row.leftPct}%`, width: `${row.widthPct}%` }"
                  ></div>
                </div>
                <div class="tr-row__dur">{{ formatDur(row.span.durationMs) }}</div>
              </div>
            </div>
          </template>
        </main>

        <aside v-if="detail" class="tr-detail">
          <template v-if="selectedSpan">
            <div class="tr-detail__header">
              <h3 class="tr-detail__name">{{ selectedSpan.name }}</h3>
              <Badge :variant="selectedSpan.status === 'error' ? 'failed' : 'active'" size="sm">{{ selectedSpan.status }}</Badge>
            </div>
            <dl class="tr-detail__stats">
              <div><dt>Service</dt><dd>{{ selectedSpan.service }}</dd></div>
              <div><dt>Kind</dt><dd>{{ selectedSpan.kind }}</dd></div>
              <div><dt>Duration</dt><dd>{{ formatDur(selectedSpan.durationMs) }}</dd></div>
              <div><dt>Started</dt><dd>{{ formatTime(selectedSpan.startedAt) }}</dd></div>
            </dl>
            <section v-if="selectedSpan.attributes && Object.keys(selectedSpan.attributes).length">
              <div class="tr-detail__label">Attributes</div>
              <dl class="tr-attrs">
                <div v-for="(v, k) in selectedSpan.attributes" :key="k">
                  <dt>{{ k }}</dt>
                  <dd><code>{{ typeof v === 'object' ? JSON.stringify(v) : String(v) }}</code></dd>
                </div>
              </dl>
            </section>
            <section v-if="selectedSpan.error">
              <div class="tr-detail__label">Error</div>
              <div class="tr-error">
                <div class="tr-error__name">{{ selectedSpan.error.name }}: {{ selectedSpan.error.message }}</div>
                <pre v-if="selectedSpan.error.stack" class="tr-error__stack">{{ selectedSpan.error.stack }}</pre>
              </div>
            </section>
            <section>
              <div class="tr-detail__label">IDs</div>
              <dl class="tr-ids">
                <div><dt>Trace</dt><dd><code>{{ selectedSpan.traceId }}</code></dd></div>
                <div><dt>Span</dt><dd><code>{{ selectedSpan.spanId }}</code></dd></div>
                <div v-if="selectedSpan.parentSpanId">
                  <dt>Parent</dt><dd><code>{{ selectedSpan.parentSpanId }}</code></dd>
                </div>
              </dl>
            </section>
          </template>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tr-actions { display: flex; gap: 8px; align-items: center; }
.tr-search {
  font-family: var(--mono);
  font-size: 12px;
  padding: 6px 10px;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background: var(--paper, #fff);
  color: var(--ink);
  width: 320px;
}
.tr-search:focus { outline: none; border-color: var(--ink-40); }
.tr-live { color: var(--status-active) !important; }

.tr-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
  min-height: 600px;
}
@media (max-width: 1200px) {
  .tr-layout { grid-template-columns: 280px minmax(0, 1fr); }
  .tr-detail { grid-column: 1 / -1; }
}

.tr-list {
  background: var(--paper, #fff);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.tr-filters {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ink-08);
}
.tr-filters select {
  flex: 1;
  font-family: var(--mono);
  font-size: 11px;
  padding: 4px 6px;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background: var(--paper, #fff);
  color: var(--ink);
}
.tr-traces { list-style: none; margin: 0; padding: 0; overflow-y: auto; max-height: 70vh; }
.tr-trace {
  padding: 10px 14px;
  border-top: 1px solid var(--ink-04);
  cursor: pointer;
  transition: background 100ms ease;
}
.tr-trace:first-child { border-top: 0; }
.tr-trace:hover { background: var(--ink-02, var(--ink-04)); }
.tr-trace--active { background: var(--ink-04); border-left: 3px solid var(--accent); padding-left: 11px; }
.tr-trace--error .tr-trace__name { color: var(--status-failed); }
.tr-trace__top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.tr-trace__name {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tr-trace__dur {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-60);
}
.tr-trace__meta { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 11px; color: var(--ink-40); }
.tr-trace__sep { opacity: 0.5; }
.tr-trace__id { font-family: var(--mono); font-size: 9.5px; color: var(--ink-40); margin-top: 4px; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tr-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--paper, #fff);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  padding: 18px 22px;
  min-width: 0;
}
.tr-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tr-header__name { margin: 0; font-size: 16px; letter-spacing: -0.1px; color: var(--ink); }
.tr-header__id { display: block; margin-top: 4px; font-family: var(--mono); font-size: 10.5px; color: var(--ink-40); }
.tr-header__stats { display: flex; gap: 18px; margin: 0; }
.tr-header__stats div { display: flex; flex-direction: column; gap: 2px; align-items: flex-end; }
.tr-header__stats dt { font-family: var(--mono); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-40); }
.tr-header__stats dd { margin: 0; font-family: var(--mono); font-size: 13px; color: var(--ink); }

.tr-waterfall {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--ink-08);
  padding-top: 8px;
  margin-top: 4px;
}
.tr-waterfall__axis {
  display: grid;
  grid-template-columns: 240px 1fr 60px;
  align-items: center;
  padding: 4px 0 8px;
  border-bottom: 1px dashed var(--ink-08);
  font-family: var(--mono);
  font-size: 9.5px;
  color: var(--ink-40);
}
.tr-waterfall__axis span:first-child { grid-column: 1; }
.tr-waterfall__axis span:not(:first-child):not(:last-child) { grid-column: 2; display: inline-block; }
.tr-waterfall__axis span:last-child { grid-column: 3; text-align: right; }
.tr-waterfall__axis { position: relative; }

.tr-row {
  display: grid;
  grid-template-columns: 240px 1fr 60px;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-top: 1px solid var(--ink-04);
  cursor: pointer;
  transition: background 100ms ease;
}
.tr-row:hover { background: var(--ink-02, var(--ink-04)); }
.tr-row--active { background: var(--ink-04); }
.tr-row__label { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tr-row__name {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tr-row__service {
  font-family: var(--mono);
  font-size: 9.5px;
  color: var(--ink-40);
}
.tr-row__track {
  position: relative;
  height: 18px;
  background: var(--ink-02, var(--ink-04));
  border-radius: 2px;
  overflow: hidden;
}
.tr-bar {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 2px;
  min-width: 2px;
}
.tr-bar--http     { background: #60a5fa; }
.tr-bar--queue    { background: #f59e0b; }
.tr-bar--workflow { background: #f97316; }
.tr-bar--cache    { background: #a3e635; }
.tr-bar--cells    { background: #34d399; }
.tr-bar--cron     { background: #c084fc; }
.tr-bar--lock     { background: #e879f9; }
.tr-bar--limit    { background: #fb7185; }
.tr-bar--realtime { background: #f472b6; }
.tr-bar--other    { background: #94a3b8; }
.tr-row--error .tr-bar { outline: 2px solid var(--status-failed); outline-offset: 1px; }
.tr-row--error .tr-row__name { color: var(--status-failed); }
.tr-row__dur {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--ink-60);
  text-align: right;
}

.tr-detail {
  background: var(--paper, #fff);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-self: start;
  position: sticky;
  top: 16px;
}
.tr-detail__header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.tr-detail__name { margin: 0; font-family: var(--mono); font-size: 13px; letter-spacing: 0.02em; color: var(--ink); overflow: hidden; text-overflow: ellipsis; }
.tr-detail__label { font-family: var(--mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-40); margin-bottom: 8px; }
.tr-detail__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
  margin: 0;
}
.tr-detail__stats div, .tr-attrs div, .tr-ids div { display: flex; flex-direction: column; gap: 2px; }
.tr-detail__stats dt, .tr-attrs dt, .tr-ids dt { font-family: var(--mono); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-40); }
.tr-detail__stats dd, .tr-attrs dd, .tr-ids dd { margin: 0; font-family: var(--mono); font-size: 11.5px; color: var(--ink); word-break: break-all; }
.tr-attrs { display: flex; flex-direction: column; gap: 8px; margin: 0; }
.tr-ids { display: flex; flex-direction: column; gap: 8px; margin: 0; }
.tr-error { background: rgba(254, 100, 100, 0.06); border-left: 3px solid var(--status-failed); padding: 10px 12px; border-radius: 2px; }
.tr-error__name { font-family: var(--mono); font-size: 12px; color: var(--status-failed); margin-bottom: 6px; }
.tr-error__stack { font-family: var(--mono); font-size: 10px; color: var(--ink-60); white-space: pre-wrap; overflow-x: auto; margin: 0; }
</style>
