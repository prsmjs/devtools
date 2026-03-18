<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

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
  const lines = edges
    .map((edge) => {
      const from = positions.get(edge.from)
      const to = positions.get(edge.to)
      if (!from || !to) return null

      return {
        ...edge,
        x1: from.x + from.width,
        y1: from.y + from.height / 2,
        x2: to.x,
        y2: to.y + to.height / 2,
        mx: (from.x + from.width + to.x) / 2,
        my: (from.y + from.height / 2 + to.y + to.height / 2) / 2,
      }
    })
    .filter(Boolean)

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
      <button @click.stop="resetView" title="reset view">1:1</button>
      <button @click.stop="toggleFullscreen" title="fullscreen">{{ fullscreen ? 'exit' : 'expand' }}</button>
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
          :d="`M ${edge.x1} ${edge.y1} C ${(edge.x1 + edge.x2) / 2} ${edge.y1}, ${(edge.x1 + edge.x2) / 2} ${edge.y2}, ${edge.x2} ${edge.y2}`"
          :class="edgeClass(edge)"
        />
        <text
          v-for="edge in layout.edges"
          :key="`${edge.from}:${edge.to}:${edge.label}:label`"
          :x="edge.mx"
          :y="edge.my - 8"
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
          v-if="stepState(node.name)?.attempts"
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
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
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
  background: var(--bg);
}

.graph-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: flex;
  gap: 4px;
}

.graph-controls button {
  padding: 4px 10px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: #888;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}

.graph-controls button:hover {
  background: var(--bg-hover);
  color: #ccc;
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
  stroke: #232323;
  stroke-width: 3;
}

.edge-seen {
  stroke: #3b3b3b;
}

.edge-active {
  stroke: #8fb3ff;
}

.edge-label {
  fill: #4a4a4a;
  font-size: 11px;
  font-family: inherit;
}

.node {
  cursor: pointer;
}

.node rect {
  fill: #151515;
  stroke: #262626;
  stroke-width: 1.5;
}

.node.selected rect {
  stroke: #6b7280;
}

.node.current rect,
.node.running rect {
  stroke: #5b8cff;
}

.node.succeeded rect,
.node.decision-success rect {
  stroke: #3d8f63;
}

.node.failed rect {
  stroke: #a14a4a;
}

.node.activity .node-type { fill: #7aa2f7; }
.node.decision .node-type { fill: #e0af68; }
.node.succeed .node-type { fill: #73daca; }
.node.fail .node-type { fill: #f7768e; }

.node-name {
  fill: var(--text-bright);
  font-size: 13px;
  font-weight: 600;
}

.node-type,
.node-meta {
  font-family: inherit;
  font-size: 11px;
}

.node-meta {
  fill: #5f5f5f;
}
</style>
