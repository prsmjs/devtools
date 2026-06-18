<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import Button from '../ui/components/Button.vue'

const props = defineProps({
  graph: { type: Object, required: true },
  execution: { type: Object, default: null },
  selectedStep: { type: String, default: null },
})

const emit = defineEmits(['select-step'])

const container = ref(null)
const fullscreen = ref(false)
const panX = ref(0)
const panY = ref(0)
const zoom = ref(1)
let dragging = false
let didDrag = false
let lastX = 0
let lastY = 0
let startX = 0
let startY = 0
const DRAG_THRESHOLD = 4

function onWheel(e) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.96 : 1.04
  const next = Math.min(3, Math.max(0.3, zoom.value * delta))

  const rect = container.value.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top

  panX.value = cx - (cx - panX.value) * (next / zoom.value)
  panY.value = cy - (cy - panY.value) * (next / zoom.value)
  zoom.value = next
}

function onPointerDown(e) {
  if (e.button !== 0) return
  dragging = true
  didDrag = false
  startX = lastX = e.clientX
  startY = lastY = e.clientY
}

function onPointerMove(e) {
  if (!dragging) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  panX.value += dx
  panY.value += dy
  lastX = e.clientX
  lastY = e.clientY
  // only count it as a drag once the pointer has moved past a small threshold, so
  // a click with a few pixels of jitter still selects the node instead of being eaten
  if (Math.abs(e.clientX - startX) > DRAG_THRESHOLD || Math.abs(e.clientY - startY) > DRAG_THRESHOLD) {
    didDrag = true
  }
}

function onPointerUp() {
  dragging = false
}

function onNodeClick(name) {
  if (didDrag) return
  emit('select-step', name)
}

function resetView() {
  panX.value = 0
  panY.value = 0
  zoom.value = 1
}

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
  resetView()
}

function onKeydown(e) {
  if (e.key === 'Escape' && fullscreen.value) {
    fullscreen.value = false
    resetView()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function buildLayout(graph) {
  const nodes = graph?.nodes ?? []
  const edges = graph?.edges ?? []
  const nextMap = new Map(nodes.map((node) => [node.name, []]))

  for (const edge of edges) {
    if (nextMap.has(edge.from)) nextMap.get(edge.from).push(edge)
  }

  // longest-path leveling via DFS. back-edges (cycles, e.g. a loop that routes to
  // an earlier step) are skipped via the recursion stack so cyclic graphs don't
  // spin forever, and a level is only revisited when a strictly longer path
  // reaches it, which bounds the walk
  const levels = new Map()
  const onPath = new Set()

  function assignLevels(name, level) {
    const seen = levels.get(name)
    if (seen != null && seen >= level) return
    levels.set(name, level)
    onPath.add(name)
    for (const edge of nextMap.get(name) ?? []) {
      if (onPath.has(edge.to)) continue
      assignLevels(edge.to, level + 1)
    }
    onPath.delete(name)
  }

  if (graph.start) assignLevels(graph.start, 0)

  const columns = []
  for (const node of nodes) {
    const level = levels.get(node.name) ?? 0
    columns[level] = columns[level] ?? []
    columns[level].push(node)
  }

  const positioned = []
  const width = 220
  const height = 92
  const xGap = 90
  const yGap = 34
  const padding = 32

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
    const column = columns[columnIndex] ?? []
    column.sort((a, b) => a.name.localeCompare(b.name))
    const totalHeight = column.length * height + Math.max(0, column.length - 1) * yGap

    for (let rowIndex = 0; rowIndex < column.length; rowIndex++) {
      const node = column[rowIndex]
      positioned.push({
        ...node,
        x: padding + columnIndex * (width + xGap),
        y: padding + rowIndex * (height + yGap) + Math.max(0, (380 - totalHeight) / 2),
        width,
        height,
      })
    }
  }

  const positions = new Map(positioned.map((node) => [node.name, node]))

  // group edges sharing the same from->to pair so parallel edges (e.g. a
  // subworkflow's succeeded/failed/canceled routes) can be fanned apart
  const groups = new Map()
  for (const edge of edges) {
    const k = `${edge.from}->${edge.to}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(edge)
  }

  const levelOf = (name) => levels.get(name) ?? 0
  const SPREAD = 26
  const lines = []
  let maxEdgeY = 0

  for (const group of groups.values()) {
    group.forEach((edge, i) => {
      const from = positions.get(edge.from)
      const to = positions.get(edge.to)
      if (!from || !to) return

      const offset = (i - (group.length - 1) / 2) * SPREAD

      // a step looping back to itself: small arc out and back into the bottom edge
      if (edge.from === edge.to) {
        const x0 = from.x + from.width * 0.35
        const x1 = from.x + from.width * 0.65
        const y0 = from.y + from.height
        const laneY = y0 + 44
        maxEdgeY = Math.max(maxEdgeY, laneY)
        lines.push({
          ...edge,
          back: true,
          d: `M ${x0} ${y0} C ${x0} ${laneY}, ${x1} ${laneY}, ${x1} ${y0}`,
          labelX: (x0 + x1) / 2,
          labelY: laneY + 12,
        })
        return
      }

      // back-edge (a cycle routing to an earlier or same column): route it under
      // the node band as a clear loop arc so it isn't hidden behind the nodes
      if (levelOf(edge.to) <= levelOf(edge.from)) {
        const startX = from.x + from.width * 0.4
        const startY = from.y + from.height
        const endX = to.x + to.width * 0.6
        const endY = to.y + to.height
        const span = Math.abs(levelOf(edge.from) - levelOf(edge.to)) || 1
        const laneY = Math.max(startY, endY) + 46 + span * 10 + Math.abs(offset)
        maxEdgeY = Math.max(maxEdgeY, laneY)
        lines.push({
          ...edge,
          back: true,
          d: `M ${startX} ${startY} C ${startX} ${laneY}, ${endX} ${laneY}, ${endX} ${endY}`,
          labelX: (startX + endX) / 2,
          labelY: laneY + 12,
        })
        return
      }

      // forward edge: left-to-right curve between node sides
      const x1 = from.x + from.width
      const y1 = from.y + from.height / 2
      const x2 = to.x
      const y2 = to.y + to.height / 2
      const cx = (x1 + x2) / 2
      // bow the curve by ~1.6x the offset so each parallel edge separates clearly
      const cpy1 = y1 + offset * 1.6
      const cpy2 = y2 + offset * 1.6

      lines.push({
        ...edge,
        d: `M ${x1} ${y1} C ${cx} ${cpy1}, ${cx} ${cpy2}, ${x2} ${y2}`,
        labelX: cx,
        labelY: (y1 + y2) / 2 + offset - 7,
      })
    })
  }

  return {
    nodes: positioned,
    edges: lines,
    width: Math.max(760, ...positioned.map((node) => node.x + node.width + padding)),
    height: Math.max(420, maxEdgeY + padding, ...positioned.map((node) => node.y + node.height + padding)),
  }
}

const layout = computed(() => buildLayout(props.graph))

function stepState(name) {
  return props.execution?.steps?.[name] ?? null
}

function nodeClass(name, type) {
  const state = stepState(name)
  if (props.execution?.currentStep === name && props.execution.status === 'running') return 'running'
  if (state?.status === 'succeeded') return type === 'decision' ? 'decision-success' : 'succeeded'
  if (state?.status === 'failed') return 'failed'
  if (props.execution?.currentStep === name) return 'current'
  return 'idle'
}

function edgeClass(edge) {
  const classes = ['edge']
  const fromState = props.execution ? stepState(edge.from) : null
  if (fromState?.route && fromState.route === edge.label) classes.push('edge-active')
  else if (fromState?.status === 'succeeded' && stepState(edge.to)) classes.push('edge-seen')
  return classes.join(' ')
}

function edgeMarker(edge) {
  const c = edgeClass(edge)
  if (c.includes('edge-active')) return 'url(#arrow-active)'
  if (c.includes('edge-seen')) return 'url(#arrow-seen)'
  return 'url(#arrow)'
}
</script>

<template>
  <div
    ref="container"
    class="graph-shell"
    :class="{ fullscreen }"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <div class="graph-controls" @pointerdown.stop @wheel.stop>
      <Button size="sm" variant="ghost" @click.stop="resetView">1:1</Button>
      <Button
        size="sm"
        variant="ghost"
        :icon="fullscreen ? 'lucide:minimize-2' : 'lucide:maximize-2'"
        @click.stop="toggleFullscreen"
      >{{ fullscreen ? 'Exit' : 'Expand' }}</Button>
    </div>
    <svg
      :viewBox="`0 0 ${layout.width} ${layout.height}`"
      class="graph"
      :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: '0 0' }"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" class="arrow-head arrow-head--idle" />
        </marker>
        <marker id="arrow-seen" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" class="arrow-head arrow-head--seen" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" class="arrow-head arrow-head--active" />
        </marker>
      </defs>
      <g>
        <path
          v-for="edge in layout.edges"
          :key="`${edge.from}:${edge.to}:${edge.label}`"
          :d="edge.d"
          :class="edgeClass(edge)"
          :marker-end="edgeMarker(edge)"
        />
        <text
          v-for="edge in layout.edges"
          :key="`${edge.from}:${edge.to}:${edge.label}:label`"
          :x="edge.labelX"
          :y="edge.labelY"
          class="edge-label"
          text-anchor="middle"
        >
          {{ edge.label }}
        </text>
      </g>

      <g
        v-for="node in layout.nodes"
        :key="node.name"
        class="node"
        :class="[node.type, nodeClass(node.name, node.type), { selected: selectedStep === node.name }]"
        @click.stop="onNodeClick(node.name)"
      >
        <rect :x="node.x" :y="node.y" :width="node.width" :height="node.height" rx="10" />
        <text v-if="node.name === graph.start" :x="node.x + 2" :y="node.y - 7" class="node-start">▸ start</text>
        <text :x="node.x + 16" :y="node.y + 28" class="node-name">{{ node.label || node.name }}</text>
        <text :x="node.x + 16" :y="node.y + 50" class="node-type">{{ node.type }}</text>
        <text
          v-if="node.type === 'subworkflow' && node.workflow"
          :x="node.x + 16"
          :y="node.y + 72"
          class="node-meta node-meta--sub"
        >
          ↳ {{ node.workflow }}
        </text>
        <text
          v-else-if="stepState(node.name)?.attempts"
          :x="node.x + 16"
          :y="node.y + 72"
          class="node-meta"
        >
          attempts {{ stepState(node.name).attempts }}
        </text>
        <text
          v-else-if="node.retry?.maxAttempts > 1"
          :x="node.x + 16"
          :y="node.y + 72"
          class="node-meta"
        >
          retries {{ node.retry.maxAttempts }}
        </text>
      </g>
    </svg>
    <div v-if="execution" class="graph-legend" @pointerdown.stop @wheel.stop>
      <span class="graph-legend__item"><i class="graph-legend__dot graph-legend__dot--active" />succeeded</span>
      <span class="graph-legend__item"><i class="graph-legend__dot graph-legend__dot--current" />running / current</span>
      <span class="graph-legend__item"><i class="graph-legend__dot graph-legend__dot--failed" />failed</span>
      <span class="graph-legend__item"><i class="graph-legend__dot graph-legend__dot--idle" />pending</span>
    </div>
  </div>
</template>

<style scoped>
.graph-shell {
  background:
    radial-gradient(60% 60% at 12% 8%, rgba(189, 187, 255, 0.12), transparent 70%),
    var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  overflow: hidden;
  position: relative;
  cursor: grab;
  touch-action: none;
}

.graph-shell:active {
  cursor: grabbing;
}

.graph-shell svg {
  user-select: none;
  -webkit-user-select: none;
}

.graph-shell.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  border-radius: 0;
  border: none;
  background: var(--paper);
}

.graph-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  gap: 6px;
}
/* opaque backing so the ghost buttons stay readable over graph content */
.graph-controls :deep(.pc-btn) {
  background: var(--paper);
}
.graph-controls :deep(.pc-btn:hover:not(:disabled)) {
  background: var(--ink-04);
}

.graph {
  width: 100%;
  min-height: 420px;
  display: block;
}

.fullscreen .graph {
  min-height: 100vh;
}

.edge {
  fill: none;
  stroke: var(--ink-20);
  stroke-width: 2.5;
}

.edge-seen {
  stroke: var(--status-active);
  opacity: 0.6;
}

.edge-active {
  stroke: var(--status-paused);
}

.arrow-head { stroke: none; }
.arrow-head--idle { fill: var(--ink-20); }
.arrow-head--seen { fill: var(--status-active); }
.arrow-head--active { fill: var(--status-paused); }

.edge-label {
  fill: var(--ink-40);
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.node {
  cursor: pointer;
}

.node rect {
  fill: var(--paper);
  stroke: var(--ink-08);
  stroke-width: 1.5;
  filter: drop-shadow(0 1px 3px rgba(1, 1, 32, 0.06));
}

.node.selected rect {
  stroke: var(--lavender);
  stroke-width: 2.5;
}

.node.current rect,
.node.running rect {
  stroke: var(--status-paused);
  stroke-width: 2;
}

.node.succeeded rect,
.node.decision-success rect {
  stroke: var(--status-active);
  stroke-width: 2;
}

.node.failed rect {
  stroke: var(--status-failed);
  stroke-width: 2;
}

.node-name {
  fill: var(--ink);
  font-family: var(--display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.16px;
}

.node-type {
  fill: var(--ink-60);
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.node-meta {
  fill: var(--ink-40);
  font-family: var(--mono);
  font-size: 10px;
}
.node-meta--sub {
  fill: var(--status-paused);
  font-weight: 500;
}
.node-start {
  fill: var(--ink-40);
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.graph-legend {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 7px 11px;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  box-shadow: var(--shadow-soft);
}
.graph-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-60);
}
.graph-legend__dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  border: 2px solid var(--ink-20);
  background: var(--paper);
}
.graph-legend__dot--active { border-color: var(--status-active); }
.graph-legend__dot--current { border-color: var(--status-paused); }
.graph-legend__dot--failed { border-color: var(--status-failed); }
.graph-legend__dot--idle { border-color: var(--ink-20); }
</style>
