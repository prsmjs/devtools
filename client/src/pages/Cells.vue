<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { api } from '../api.js'
import { useSSE } from '../sse.js'
import JsonView from '../components/JsonView.vue'

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

const nodeSize = { w: 160, h: 56 }
const gap = { y: 24 }
const minGapX = 80
const padding = 20

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
    case 'current': return 'var(--color-green)'
    case 'pending': return 'var(--color-blue)'
    case 'stale': return 'var(--color-yellow)'
    case 'error': return 'var(--color-red)'
    default: return 'var(--text-muted)'
  }
}
</script>

<template>
  <div class="cells-page">
    <div class="cells-toolbar">
      <div class="left-group">
        <div class="graph-tabs" v-if="graphs.length > 1">
          <button
            v-for="name in graphs"
            :key="name"
            :class="{ active: name === currentGraph }"
            @click="currentGraph = name"
          >{{ name }}</button>
        </div>
        <div class="view-toggle">
          <button :class="{ active: view === 'table' }" @click="view = 'table'">table</button>
          <button :class="{ active: view === 'graph' }" @click="view = 'graph'">graph</button>
        </div>
      </div>
      <div class="stats">
        <span>{{ cells.length }} cells</span>
        <span class="dot"></span>
        <span>{{ cells.filter(c => c.status === 'current').length }} current</span>
        <span v-if="cells.filter(c => c.status === 'pending').length" class="dot"></span>
        <span v-if="cells.filter(c => c.status === 'pending').length" style="color: var(--color-blue)">{{ cells.filter(c => c.status === 'pending').length }} pending</span>
        <span v-if="cells.filter(c => c.status === 'error').length" class="dot"></span>
        <span v-if="cells.filter(c => c.status === 'error').length" style="color: var(--color-red)">{{ cells.filter(c => c.status === 'error').length }} error</span>
      </div>
    </div>

    <div class="cells-layout">
      <div class="cells-main">
        <div v-if="view === 'table'" class="card">
          <div class="cell-row header">
            <span class="col-name">name</span>
            <span class="col-value">value</span>
            <span class="col-deps">deps</span>
            <span class="col-status">status</span>
            <span class="col-updated">updated</span>
          </div>
          <div
            v-for="cell in cells"
            :key="cell.name"
            class="cell-row"
            :class="{ selected: selected?.name === cell.name, recent: isRecent(cell.name) }"
            @click="select(cell)"
          >
            <span class="col-name">{{ cell.name }}</span>
            <span class="col-value" :title="JSON.stringify(cell.value)">{{ formatValue(cell.value) }}</span>
            <span class="col-deps">{{ cell.deps.length ? cell.deps.join(', ') : '—' }}</span>
            <span class="col-status" :style="{ color: statusColor(cell.status) }">{{ cell.status === 'current' ? '' : cell.status }}</span>
            <span class="col-updated">{{ formatTime(cell.updatedAt) }}</span>
          </div>
          <div v-if="!cells.length" class="empty">no cells in graph</div>
        </div>

        <div v-else class="graph-wrap" ref="graphWrap">
          <svg :width="layout.width" :height="layout.height">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--text-muted)" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
              </marker>
            </defs>
            <g>
              <path
                v-for="(edge) in edges"
                :key="`${edge.from}->${edge.to}`"
                :d="`M${edge.x1},${edge.y1} C${edge.x1 + 30},${edge.y1} ${edge.x2 - 30},${edge.y2} ${edge.x2},${edge.y2}`"
                fill="none"
                stroke-width="1"
                class="edge-line"
                :class="{ recent: isRecent(edge.from) }"
                :marker-end="isRecent(edge.from) ? 'url(#arrow-active)' : 'url(#arrow)'"
              />
            </g>
            <g
              v-for="cell in cells"
              :key="cell.name"
              :transform="`translate(${layout.positions.get(cell.name)?.x ?? 0}, ${layout.positions.get(cell.name)?.y ?? 0})`"
              class="node-group"
              :class="{ selected: selected?.name === cell.name, recent: isRecent(cell.name) }"
              @click="select(cell)"
            >
              <rect :width="nodeSize.w" :height="nodeSize.h" rx="4" />
              <circle :cx="10" :cy="10" r="3" :fill="statusColor(cell.status)" />
              <clipPath :id="`clip-${cell.name}`">
                <rect :width="nodeSize.w - 8" :height="nodeSize.h - 4" x="4" y="2" />
              </clipPath>
              <g :clip-path="`url(#clip-${cell.name})`">
                <text :x="nodeSize.w / 2" :y="24" text-anchor="middle" class="node-name">{{ truncate(cell.name, 22) }}</text>
                <text :x="nodeSize.w / 2" :y="42" text-anchor="middle" class="node-value">{{ truncate(formatValue(cell.value), 22) }}</text>
              </g>
            </g>
          </svg>
          <div v-if="!cells.length" class="empty">no cells in graph</div>
        </div>
      </div>

    </div>

    <div class="cells-detail" v-if="selected">
      <div class="detail-header">
        <span class="detail-name">{{ selected.name }}</span>
        <span
          v-if="selected.status !== 'current'"
          class="detail-status"
          :style="{ color: statusColor(selected.status) }"
        >{{ selected.status }}</span>
        <span class="detail-close" @click="closeDetail">×</span>
      </div>

      <div class="detail-grid">
        <div class="detail-main">
          <div class="detail-card span-2">
            <div class="detail-label">value</div>
            <div class="detail-content scroll-y">
              <JsonView :data="selected.value" />
            </div>
          </div>

          <div class="detail-card span-2" v-if="selected.template">
            <div class="detail-label">template</div>
            <pre class="detail-pre">{{ selected.template }}</pre>
          </div>

          <div class="detail-card">
            <div class="detail-label">
              history
              <span v-if="selected.historyLimit > 0" class="detail-label-meta">{{ history.length }} / {{ selected.historyLimit }}</span>
            </div>
            <div v-if="selected.historyLimit > 0" class="history-list">
              <div v-for="entry in history.slice().reverse()" :key="entry.timestamp" class="history-entry">
                <span class="history-time">{{ formatTime(entry.timestamp) }}</span>
                <span class="history-value" :title="JSON.stringify(entry.value)">{{ formatValue(entry.value) }}</span>
              </div>
              <div v-if="!history.length" class="empty-small">no entries yet</div>
            </div>
            <div v-else class="history-disabled">
              History is not enabled for this cell. To capture recent values, define it with <code>{ history: true }</code> or <code>{ history: N }</code>.
            </div>
          </div>

          <div class="detail-card" v-if="selected.error">
            <div class="detail-label">error</div>
            <div class="detail-content" style="color: var(--color-red)">{{ selected.error }}</div>
          </div>

          <div class="detail-card" v-if="selected.source">
            <div class="detail-label">source</div>
            <div class="kv-list">
              <div v-for="(v, k) in selected.source" :key="k" class="kv-list-row">
                <span class="kv-list-key">{{ k }}</span>
                <span class="kv-list-val">{{ typeof v === 'object' ? JSON.stringify(v) : String(v) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-card" v-if="selected.metadata">
            <div class="detail-label">metadata</div>
            <div class="kv-list">
              <div v-for="(v, k) in selected.metadata" :key="k" class="kv-list-row">
                <span class="kv-list-key">{{ k }}</span>
                <span class="kv-list-val">{{ typeof v === 'object' ? JSON.stringify(v) : String(v) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-side">
          <div class="detail-card">
            <div class="detail-label">graph</div>
            <div class="kv-list">
              <div class="kv-list-row">
                <span class="kv-list-key">deps</span>
                <span class="kv-list-val">{{ selected.deps.length ? selected.deps.join(', ') : '—' }}</span>
              </div>
              <div class="kv-list-row">
                <span class="kv-list-key">dependents</span>
                <span class="kv-list-val">{{ selected.dependents.length ? selected.dependents.join(', ') : '—' }}</span>
              </div>
              <div class="kv-list-row" v-if="selected.computeTime !== null && selected.computeTime !== undefined">
                <span class="kv-list-key">last compute</span>
                <span class="kv-list-val">{{ selected.computeTime }}ms</span>
              </div>
              <div class="kv-list-row">
                <span class="kv-list-key">updated</span>
                <span class="kv-list-val">{{ formatTime(selected.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cells-page { display: flex; flex-direction: column; gap: 12px; }

.cells-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.left-group { display: flex; align-items: center; gap: 12px; }
.graph-tabs { display: flex; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.graph-tabs button {
  padding: 6px 14px; background: var(--bg-surface); color: var(--text-muted); border: none;
  font: inherit; font-size: 11px; cursor: pointer; border-right: 1px solid var(--border);
}
.graph-tabs button:last-child { border-right: none; }
.graph-tabs button.active { background: var(--accent-dim); color: var(--accent-text); }
.graph-tabs button:hover:not(.active) { background: var(--bg-hover); color: var(--text); }
.view-toggle { display: flex; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.view-toggle button {
  padding: 6px 14px; background: var(--bg-surface); color: var(--text-muted); border: none;
  font: inherit; font-size: 11px; cursor: pointer; border-right: 1px solid var(--border);
}
.view-toggle button:last-child { border-right: none; }
.view-toggle button.active { background: var(--accent-dim); color: var(--accent-text); }
.view-toggle button:hover:not(.active) { background: var(--bg-hover); color: var(--text); }

.stats { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted); }
.dot { width: 3px; height: 3px; background: var(--text-muted); border-radius: 50%; }

.cells-layout { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.cells-main { min-width: 0; overflow: auto; }
.cells-detail {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: 4px; padding: 12px;
}

.detail-grid {
  display: grid; gap: 10px;
  grid-template-columns: minmax(0, 1fr) 240px;
}
.detail-main {
  display: grid; gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  min-width: 0;
}
.detail-side { display: flex; flex-direction: column; gap: 10px; }
.detail-card {
  background: var(--bg); border: 1px solid var(--border-subtle); border-radius: 3px;
  padding: 10px; min-width: 0; display: flex; flex-direction: column; gap: 6px;
}
.detail-card.span-2 { grid-column: span 2; }
@media (max-width: 900px) {
  .detail-grid { grid-template-columns: minmax(0, 1fr); }
  .detail-card.span-2 { grid-column: span 1; }
}
.scroll-y { max-height: 220px; overflow-y: auto; }

.kv-list { display: flex; flex-direction: column; gap: 8px; }
.kv-list-row { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.kv-list-key {
  font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;
}
.kv-list-val {
  font-size: 11px; color: var(--text); word-break: break-word;
  font-family: 'SF Mono', monospace;
}

.cell-row { display: flex; align-items: center; border-bottom: 1px solid var(--border-subtle); font-size: 11px; cursor: pointer; }
.cell-row:last-child { border-bottom: none; }
.cell-row:hover { background: var(--bg-hover); }
.cell-row.selected { background: var(--accent-dim); }
.cell-row.recent { animation: flash 0.8s ease-out; }
.cell-row.header {
  font-size: 10px; color: var(--text-muted); letter-spacing: 0.3px; text-transform: uppercase;
  cursor: default; border-bottom: 1px solid var(--border);
}
.cell-row.header:hover { background: transparent; }

@keyframes flash {
  0% { background: var(--accent-dim); }
  100% { background: transparent; }
}

.col-name { flex: 0 0 200px; padding: 8px 12px; color: var(--text-bright); }
.col-value { flex: 1; padding: 8px 12px; color: var(--text); font-family: 'SF Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-deps { flex: 0 0 200px; padding: 8px 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-status { flex: 0 0 80px; padding: 8px 12px; }
.col-updated { flex: 0 0 100px; padding: 8px 12px; color: var(--text-muted); text-align: right; }

.graph-wrap { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 8px; overflow: auto; width: 100%; box-sizing: border-box; }
.graph-wrap svg { display: block; }

.node-group { cursor: pointer; }
.node-group rect { fill: var(--bg-raised); stroke: var(--border); stroke-width: 1; }
.node-group:hover rect { stroke: var(--text-muted); }
.node-group.selected rect { stroke: var(--accent); stroke-width: 1.5; }
.node-group.recent rect { animation: pulse-rect 0.8s ease-out; }

@keyframes pulse-rect {
  0% { fill: var(--accent-dim); stroke: var(--accent); }
  100% { fill: var(--bg-raised); stroke: var(--border); }
}

.edge-line { stroke: var(--border); }
.edge-line.recent { animation: pulse-edge 0.8s ease-out; }
@keyframes pulse-edge {
  0% { stroke: var(--accent); }
  100% { stroke: var(--border); }
}

.node-name { fill: var(--text-bright); font: 600 11px 'SF Mono', monospace; }
.node-value { fill: var(--text); font: 10px 'SF Mono', monospace; }

.detail-header {
  display: flex; align-items: center; gap: 8px; padding-bottom: 10px; margin-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.detail-name { flex: 1; font-size: 12px; color: var(--text-bright); font-weight: 600; }
.detail-status { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
.detail-spacer { flex: 1; }
.detail-close { cursor: pointer; color: var(--text-muted); font-size: 16px; padding: 0 4px; }
.detail-close:hover { color: var(--text-bright); }

.detail-section { margin-bottom: 14px; }
.detail-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.detail-content { font-size: 11px; color: var(--text); word-break: break-word; }
.detail-pre {
  font: 11px 'SF Mono', monospace; color: var(--text); background: var(--bg);
  border: 1px solid var(--border-subtle); border-radius: 3px; padding: 8px;
  white-space: pre-wrap; overflow-x: auto; max-height: 220px;
}

.detail-label { display: flex; align-items: center; gap: 8px; }
.detail-label-meta { font-size: 9px; color: var(--text); text-transform: none; letter-spacing: 0; font-family: 'SF Mono', monospace; }
.history-disabled { font-size: 10px; color: var(--text-muted); line-height: 1.5; }
.history-disabled code { background: var(--bg-raised); color: var(--text); padding: 1px 4px; border-radius: 2px; font-size: 10px; }
.history-list { display: flex; flex-direction: column; gap: 2px; max-height: 240px; overflow-y: auto; }
.history-entry {
  display: flex; gap: 8px; align-items: center; font-size: 10px; padding: 3px 6px;
  background: var(--bg); border-radius: 2px;
}
.history-time { flex: 0 0 70px; color: var(--text-muted); }
.history-value { flex: 1; color: var(--text); font-family: 'SF Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 11px; }
.empty-small { padding: 6px; text-align: center; color: var(--text-muted); font-size: 10px; }
</style>
