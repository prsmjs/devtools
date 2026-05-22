<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { api } from '../api.js'
import { useSSE } from '../sse.js'
import JsonView from '../components/JsonView.vue'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import Tabs from '../ui/components/Tabs.vue'
import KeyValue from '../ui/components/KeyValue.vue'
import ScrollArea from '../ui/components/ScrollArea.vue'
import SectionLabel from '../ui/components/SectionLabel.vue'
import Button from '../ui/components/Button.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import Badge from '../ui/components/Badge.vue'

const props = defineProps({ config: Object })

const graphs = computed(() => props.config?.cells ?? [])
const currentGraph = ref(null)

const cells = ref([])
const view = ref('table')
const graphWrap = ref(null)
const containerWidth = ref(0)
let resizeObserver = null
const selectedName = ref(null)
const selected = computed(() =>
  selectedName.value ? cells.value.find((c) => c.name === selectedName.value) ?? null : null
)
const history = ref([])
const events = useSSE()
let pollTimer = null
let recentTimer = null
let lastProcessedTs = 0
const recentlyUpdated = ref(new Map())

watch(graphs, (list) => {
  if (list.length && !list.includes(currentGraph.value)) {
    currentGraph.value = list[0]
  }
}, { immediate: true })

watch(currentGraph, () => {
  cells.value = []
  selectedName.value = null
  history.value = []
  recentlyUpdated.value.clear()
  lastProcessedTs = Date.now()
  poll()
})

async function poll() {
  if (!currentGraph.value) return
  const res = await fetch(api(`/cells/${encodeURIComponent(currentGraph.value)}`))
  if (res.ok) {
    const data = await res.json()
    cells.value = data.cells
  }
}

async function loadHistory(name) {
  if (!currentGraph.value) return
  const res = await fetch(api(`/cells/${encodeURIComponent(currentGraph.value)}/${encodeURIComponent(name)}/history?limit=50`))
  if (res.ok) {
    const data = await res.json()
    if (selectedName.value === name) history.value = data.entries
  }
}

onMounted(() => {
  poll()
  pollTimer = setInterval(poll, 1500)
  recentTimer = setInterval(() => {
    const now = Date.now()
    const expired = []
    for (const [k, t] of recentlyUpdated.value) {
      if (now - t > 800) expired.push(k)
    }
    for (const k of expired) recentlyUpdated.value.delete(k)
  }, 200)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (recentTimer) clearInterval(recentTimer)
  if (resizeObserver) resizeObserver.disconnect()
})

watch(graphWrap, (el) => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (el) {
    resizeObserver = new ResizeObserver((entries) => {
      containerWidth.value = entries[0].contentRect.width
    })
    resizeObserver.observe(el)
    containerWidth.value = el.clientWidth
  }
})

watch(events, (list) => {
  if (!currentGraph.value) return
  const fresh = list.filter(
    (e) => e.type === 'cells:change' && e.ts > lastProcessedTs && e.data.graph === currentGraph.value
  )
  if (fresh.length === 0) return
  lastProcessedTs = Math.max(...fresh.map((e) => e.ts))

  for (const ev of fresh) {
    recentlyUpdated.value.set(ev.data.name, ev.ts)
  }

  const target = cells.value
  for (const ev of fresh) {
    const idx = target.findIndex((c) => c.name === ev.data.name)
    if (idx >= 0) {
      target[idx] = { ...target[idx], value: ev.data.value, status: ev.data.status, updatedAt: ev.data.updatedAt }
    }
  }
  if (selectedName.value && fresh.some((e) => e.data.name === selectedName.value)) {
    loadHistory(selectedName.value)
  }
}, { deep: true })

function select(cell) {
  selectedName.value = cell.name
  history.value = []
  if (cell?.historyLimit > 0) {
    loadHistory(cell.name)
  }
}

function closeDetail() {
  selectedName.value = null
  history.value = []
}

function truncate(s, n) {
  s = String(s ?? '')
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function formatValue(v) {
  if (v === undefined) return '—'
  if (v === null) return 'null'
  if (typeof v === 'string') return v.length > 80 ? v.slice(0, 80) + '…' : v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return String(v)
  try {
    const s = JSON.stringify(v)
    return s.length > 80 ? s.slice(0, 80) + '…' : s
  } catch {
    return String(v)
  }
}

function formatTime(ts) {
  if (!ts) return '—'
  const diff = Date.now() - ts
  if (diff < 1000) return 'just now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return new Date(ts).toLocaleTimeString()
}

const cellsByName = computed(() => {
  const map = new Map()
  for (const c of cells.value) map.set(c.name, c)
  return map
})

const topoLevels = computed(() => {
  const map = cellsByName.value
  const remaining = new Set(map.keys())
  const placed = new Set()
  const levels = []
  while (remaining.size > 0) {
    const level = []
    for (const name of remaining) {
      const cell = map.get(name)
      const ready = cell.deps.every((d) => !remaining.has(d) || placed.has(d))
      if (ready) level.push(name)
    }
    if (level.length === 0) break
    for (const n of level) {
      remaining.delete(n)
      placed.add(n)
    }
    levels.push(level)
  }
  return levels
})

const nodeSize = { w: 168, h: 60 }
const gap = { y: 28 }
const minGapX = 90
const padding = 24

const layout = computed(() => {
  const positions = new Map()
  const levels = topoLevels.value
  if (levels.length === 0) return { positions, width: 0, height: 0 }

  const minWidth = levels.length * nodeSize.w + (levels.length - 1) * minGapX + padding * 2
  const width = Math.max(minWidth, containerWidth.value || minWidth)
  const colStep = levels.length > 1
    ? (width - padding * 2 - nodeSize.w) / (levels.length - 1)
    : 0

  let maxY = 0
  const maxRowHeight = Math.max(
    ...levels.map((lv) => lv.length * nodeSize.h + (lv.length - 1) * gap.y)
  )

  levels.forEach((level, lvIdx) => {
    const totalH = level.length * nodeSize.h + (level.length - 1) * gap.y
    const startY = Math.max(0, (maxRowHeight - totalH) / 2)
    level.forEach((name, i) => {
      const x = lvIdx * colStep + padding
      const y = startY + i * (nodeSize.h + gap.y) + padding
      positions.set(name, { x, y })
      if (y + nodeSize.h > maxY) maxY = y + nodeSize.h
    })
  })
  return { positions, width, height: maxY + padding }
})

const edges = computed(() => {
  const positions = layout.value.positions
  const result = []
  for (const c of cells.value) {
    const to = positions.get(c.name)
    if (!to) continue
    for (const dep of c.deps) {
      const from = positions.get(dep)
      if (!from) continue
      result.push({
        x1: from.x + nodeSize.w,
        y1: from.y + nodeSize.h / 2,
        x2: to.x,
        y2: to.y + nodeSize.h / 2,
        from: dep,
        to: c.name,
      })
    }
  }
  return result
})

function isRecent(name) {
  return recentlyUpdated.value.has(name)
}

function statusColor(status) {
  switch (status) {
    case 'current': return 'var(--status-active)'
    case 'pending': return 'var(--status-paused)'
    case 'stale': return 'var(--status-warning)'
    case 'error': return 'var(--status-failed)'
    default: return 'var(--ink-40)'
  }
}

function statusVariant(status) {
  switch (status) {
    case 'pending': return 'paused'
    case 'stale': return 'warning'
    case 'error': return 'failed'
    default: return 'active'
  }
}

const counts = computed(() => {
  const c = { current: 0, pending: 0, error: 0, stale: 0 }
  for (const cell of cells.value) {
    if (c[cell.status] !== undefined) c[cell.status]++
  }
  return c
})

function toKvItems(obj) {
  if (!obj) return []
  return Object.entries(obj).map(([label, v]) => ({
    label,
    value: typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v),
  }))
}

const sourceItems = computed(() => toKvItems(selected.value?.source))
const metadataItems = computed(() => toKvItems(selected.value?.metadata))

const graphItems = computed(() => {
  const s = selected.value
  if (!s) return []
  const items = [
    { label: 'Dependencies', value: s.deps.length ? s.deps.join(', ') : '—' },
    { label: 'Dependents', value: s.dependents.length ? s.dependents.join(', ') : '—' },
  ]
  if (s.computeTime != null) items.push({ label: 'Last compute', value: `${s.computeTime}ms` })
  items.push({ label: 'Updated', value: formatTime(s.updatedAt) })
  return items
})

const historyItems = computed(() =>
  history.value.slice().reverse().map((e) => ({
    label: formatTime(e.timestamp),
    value: formatValue(e.value),
  }))
)
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Reactive graphs"
      title="Cells"
      subtitle="Inspect reactive computation graphs - values, dependencies, and live propagation."
    >
      <template #actions>
        <Tabs
          v-if="graphs.length > 1"
          :model-value="currentGraph"
          :tabs="graphs.map((g) => ({ value: g, label: g }))"
          variant="pills"
          @update:model-value="currentGraph = $event"
        />
      </template>
    </PageHeader>

    <div class="page-body">
      <section class="page-section">
        <div class="cells-toolbar">
          <Tabs
            v-model="view"
            :tabs="[{ value: 'table', label: 'Table' }, { value: 'graph', label: 'Graph' }]"
            variant="pills"
          />
          <div class="cell-counts">
            <span>{{ cells.length }} cells</span>
            <span class="cell-counts__sep" />
            <span class="cell-counts__stat">{{ counts.current }} current</span>
            <template v-if="counts.pending">
              <span class="cell-counts__sep" />
              <span class="cell-counts__stat" style="color: var(--status-paused)">{{ counts.pending }} pending</span>
            </template>
            <template v-if="counts.error">
              <span class="cell-counts__sep" />
              <span class="cell-counts__stat" style="color: var(--status-failed)">{{ counts.error }} error</span>
            </template>
          </div>
        </div>

        <Panel>
          <div v-if="view === 'table'">
            <div v-if="cells.length" class="ctable">
              <div class="ctable__head">
                <span class="ctable__col ctable__col--name">Name</span>
                <span class="ctable__col ctable__col--value">Value</span>
                <span class="ctable__col ctable__col--deps">Dependencies</span>
                <span class="ctable__col ctable__col--status">Status</span>
                <span class="ctable__col ctable__col--updated">Updated</span>
              </div>
              <div
                v-for="cell in cells"
                :key="cell.name"
                class="ctable__row"
                :class="{ 'ctable__row--selected': selectedName === cell.name, 'ctable__row--recent': isRecent(cell.name) }"
                @click="select(cell)"
              >
                <span class="ctable__col ctable__col--name">{{ cell.name }}</span>
                <span class="ctable__col ctable__col--value" :title="JSON.stringify(cell.value)">{{ formatValue(cell.value) }}</span>
                <span class="ctable__col ctable__col--deps">{{ cell.deps.length ? cell.deps.join(', ') : '—' }}</span>
                <span class="ctable__col ctable__col--status">
                  <Badge v-if="cell.status !== 'current'" :variant="statusVariant(cell.status)" size="sm">{{ cell.status }}</Badge>
                </span>
                <span class="ctable__col ctable__col--updated">{{ formatTime(cell.updatedAt) }}</span>
              </div>
            </div>
            <EmptyState v-else title="No cells" description="This graph has no cells defined." />
          </div>

          <div v-else>
            <div v-if="cells.length" class="graph-wrap pc-scroll" ref="graphWrap">
              <svg :width="layout.width" :height="layout.height">
                <defs>
                  <marker id="cell-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="rgba(0,0,0,0.25)" />
                  </marker>
                  <marker id="cell-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="var(--lavender)" />
                  </marker>
                </defs>
                <g>
                  <path
                    v-for="edge in edges"
                    :key="`${edge.from}->${edge.to}`"
                    :d="`M${edge.x1},${edge.y1} C${edge.x1 + 36},${edge.y1} ${edge.x2 - 36},${edge.y2} ${edge.x2},${edge.y2}`"
                    fill="none"
                    stroke-width="1.5"
                    class="edge-line"
                    :class="{ recent: isRecent(edge.from) }"
                    :marker-end="isRecent(edge.from) ? 'url(#cell-arrow-active)' : 'url(#cell-arrow)'"
                  />
                </g>
                <g
                  v-for="cell in cells"
                  :key="cell.name"
                  :transform="`translate(${layout.positions.get(cell.name)?.x ?? 0}, ${layout.positions.get(cell.name)?.y ?? 0})`"
                  class="node-group"
                  :class="{ selected: selectedName === cell.name, recent: isRecent(cell.name) }"
                  @click="select(cell)"
                >
                  <rect :width="nodeSize.w" :height="nodeSize.h" rx="8" />
                  <circle :cx="14" :cy="14" r="3.5" :fill="statusColor(cell.status)" />
                  <clipPath :id="`clip-${cell.name}`">
                    <rect :width="nodeSize.w - 10" :height="nodeSize.h - 6" x="5" y="3" />
                  </clipPath>
                  <g :clip-path="`url(#clip-${cell.name})`">
                    <text :x="nodeSize.w / 2" :y="26" text-anchor="middle" class="node-name">{{ truncate(cell.name, 22) }}</text>
                    <text :x="nodeSize.w / 2" :y="45" text-anchor="middle" class="node-value">{{ truncate(formatValue(cell.value), 24) }}</text>
                  </g>
                </g>
              </svg>
            </div>
            <EmptyState v-else title="No cells" description="This graph has no cells defined." />
          </div>
        </Panel>
      </section>

      <section v-if="selected" class="page-section">
        <Panel gradient elevated accent="lavender">
          <template #header>
            <SectionLabel size="md">{{ currentGraph }}</SectionLabel>
            <h2 class="detail-title">{{ selected.name }}</h2>
            <p class="detail-sub">
              {{ selected.kind === 'template' ? 'Templated cell' : selected.deps.length ? 'Computed cell' : 'Source cell' }}
            </p>
          </template>
          <template #aside>
            <div class="detail-aside">
              <Badge :variant="statusVariant(selected.status)" dot>{{ selected.status }}</Badge>
              <Button variant="ghost" size="sm" icon="lucide:x" @click="closeDetail" />
            </div>
          </template>

          <PanelSection label="Value">
            <div class="detail-box detail-box--scroll">
              <JsonView :data="selected.value" />
            </div>
          </PanelSection>

          <PanelSection v-if="selected.template" label="Template">
            <pre class="detail-template">{{ selected.template }}</pre>
          </PanelSection>

          <PanelSection v-if="selected.error" label="Error">
            <div class="detail-box detail-error">{{ selected.error }}</div>
          </PanelSection>

          <PanelSection :label="`History${selected.historyLimit > 0 ? ` · ${history.length} / ${selected.historyLimit}` : ''}`">
            <ScrollArea v-if="selected.historyLimit > 0 && historyItems.length" max-height="260px">
              <KeyValue layout="divided" boxed compact :items="historyItems" />
            </ScrollArea>
            <p v-else-if="selected.historyLimit > 0" class="detail-hint">No entries captured yet.</p>
            <p v-else class="detail-hint">
              History is not enabled for this cell. Define it with
              <code>{ history: true }</code> or <code>{ history: N }</code> to capture recent values.
            </p>
          </PanelSection>

          <PanelSection v-if="sourceItems.length" label="Source">
            <KeyValue layout="divided" boxed :items="sourceItems" />
          </PanelSection>

          <PanelSection v-if="metadataItems.length" label="Metadata">
            <KeyValue layout="divided" boxed :items="metadataItems" />
          </PanelSection>

          <PanelSection label="Dependencies" tone="muted">
            <KeyValue layout="divided" :dividers="false" :items="graphItems" />
          </PanelSection>
        </Panel>
      </section>
    </div>
  </div>
</template>

<style scoped>
.cells-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.cell-counts {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--ink-60);
}
.cell-counts__sep { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-20); }
.cell-counts__stat { font-variant-numeric: tabular-nums; }

/* table */
.ctable { display: flex; flex-direction: column; }
.ctable__head,
.ctable__row {
  display: flex;
  align-items: center;
}
.ctable__head {
  border-bottom: 1px solid var(--ink-08);
}
.ctable__head .ctable__col {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 500;
  color: var(--ink-60);
  padding: 12px 16px;
}
.ctable__row {
  border-bottom: 1px solid var(--ink-08);
  cursor: pointer;
  transition: background 120ms ease;
}
.ctable__row:last-child { border-bottom: 0; }
.ctable__row:hover { background: var(--ink-04); }
.ctable__row--selected { background: rgba(189, 187, 255, 0.16); }
.ctable__row--recent { animation: cell-flash 0.8s ease-out; }
@keyframes cell-flash {
  0% { background: rgba(189, 187, 255, 0.45); }
  100% { background: transparent; }
}
.ctable__col { padding: 13px 16px; font-size: 14px; }
.ctable__col--name { flex: 0 0 220px; font-weight: 500; color: var(--ink); letter-spacing: -0.16px; }
.ctable__col--value {
  flex: 1; min-width: 0;
  font-family: var(--mono); font-size: 12.5px; color: var(--ink-60);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ctable__col--deps {
  flex: 0 0 240px;
  font-size: 12.5px; color: var(--ink-40);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ctable__col--status { flex: 0 0 110px; }
.ctable__col--updated {
  flex: 0 0 120px; text-align: right;
  font-size: 12.5px; color: var(--ink-40);
  font-variant-numeric: tabular-nums;
}

/* graph */
.graph-wrap { width: 100%; padding: 12px; overflow: auto; }
.graph-wrap svg { display: block; }
.node-group { cursor: pointer; }
.node-group rect {
  fill: var(--paper);
  stroke: var(--ink-08);
  stroke-width: 1;
  filter: drop-shadow(0 1px 2px rgba(1, 1, 32, 0.05));
}
.node-group:hover rect { stroke: var(--ink-20); }
.node-group.selected rect { stroke: var(--lavender); stroke-width: 2; }
.node-group.recent rect { animation: node-flash 0.8s ease-out; }
@keyframes node-flash {
  0% { fill: rgba(189, 187, 255, 0.35); stroke: var(--lavender); }
  100% { fill: var(--paper); stroke: var(--ink-08); }
}
.edge-line { stroke: var(--ink-20); }
.edge-line.recent { animation: edge-flash 0.8s ease-out; }
@keyframes edge-flash {
  0% { stroke: var(--lavender); }
  100% { stroke: var(--ink-20); }
}
.node-name {
  fill: var(--ink);
  font-family: var(--display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.1px;
}
.node-value {
  fill: var(--ink-60);
  font-family: var(--mono);
  font-size: 11px;
}

/* detail panel */
.detail-title {
  margin: 8px 0 0;
  font-family: var(--display);
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.56px;
  line-height: 1.1;
  color: var(--ink);
}
.detail-sub {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--ink-60);
  letter-spacing: -0.14px;
}
.detail-aside { display: flex; align-items: center; gap: 10px; }

.detail-box {
  background: var(--ink-04);
  border-radius: var(--radius-comfy);
  padding: 14px 16px;
}
.detail-box--scroll { max-height: 280px; overflow-y: auto; }
.detail-error {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--status-failed);
  word-break: break-word;
}
.detail-template {
  margin: 0;
  background: var(--ink-04);
  border-radius: var(--radius-comfy);
  padding: 14px 16px;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 280px;
  overflow-y: auto;
}
.detail-hint {
  margin: 0;
  font-size: 13.5px;
  color: var(--ink-60);
  line-height: 1.55;
}
.detail-hint code {
  font-family: var(--mono);
  font-size: 11.5px;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: 3px;
  padding: 1px 5px;
}
</style>
