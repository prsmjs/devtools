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
  lastX = e.clientX
  lastY = e.clientY
}

function onPointerMove(e) {
  if (!dragging) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  if (dx !== 0 || dy !== 0) didDrag = true
  panX.value += dx
  panY.value += dy
  lastX = e.clientX
  lastY = e.clientY
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
  const incoming = new Map(nodes.map((node) => [node.name, 0]))
  const nextMap = new Map(nodes.map((node) => [node.name, []]))

  for (const edge of edges) {
    if (incoming.has(edge.to)) incoming.set(edge.to, incoming.get(edge.to) + 1)
    if (nextMap.has(edge.from)) nextMap.get(edge.from).push(edge)
  }

  const queue = [graph.start]
  const levels = new Map([[graph.start, 0]])

  while (queue.length) {
    const name = queue.shift()
    for (const edge of nextMap.get(name) ?? []) {
      const nextLevel = (levels.get(name) ?? 0) + 1
      if (!levels.has(edge.to) || nextLevel > levels.get(edge.to)) {
        levels.set(edge.to, nextLevel)
      }
      incoming.set(edge.to, Math.max(0, (incoming.get(edge.to) ?? 0) - 1))
      if (incoming.get(edge.to) === 0) queue.push(edge.to)
    }
  }

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

  const SPREAD = 26
  const lines = []
  for (const group of groups.values()) {
    group.forEach((edge, i) => {
      const from = positions.get(edge.from)
      const to = positions.get(edge.to)
      if (!from || !to) return

      const x1 = from.x + from.width
      const y1 = from.y + from.height / 2
      const x2 = to.x
      const y2 = to.y + to.height / 2
      const offset = (i - (group.length - 1) / 2) * SPREAD
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
    height: Math.max(420, ...positioned.map((node) => node.y + node.height + padding)),
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
  if (!props.execution) return 'edge'
  const fromState = stepState(edge.from)
  if (fromState?.route && fromState.route === edge.label) return 'edge edge-active'
  if (stepState(edge.from)?.status === 'succeeded' && stepState(edge.to)) return 'edge edge-seen'
  return 'edge'
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
    <div class="graph-controls">
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
      <g>
        <path
          v-for="edge in layout.edges"
          :key="`${edge.from}:${edge.to}:${edge.label}`"
          :d="edge.d"
          :class="edgeClass(edge)"
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
</style>
