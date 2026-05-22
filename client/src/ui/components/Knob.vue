<script setup>
import { computed, ref } from "vue"

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  size: { type: Number, default: 72 },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: "" },
  formatValue: { type: Function, default: (v) => String(v) },
})
const emit = defineEmits(["update:modelValue"])

// 270deg sweep with the gap at the bottom
const SWEEP = 270
const START = -135

const range = computed(() => props.max - props.min || 1)
const fraction = computed(() => (props.modelValue - props.min) / range.value)
const angle = computed(() => START + fraction.value * SWEEP)

const clamp = (v) => Math.max(props.min, Math.min(props.max, v))
const snap = (v) => clamp(Math.round((v - props.min) / props.step) * props.step + props.min)

// geometry, in a 100x100 viewBox
const C = 50
const polar = (deg, r) => {
  const a = (deg - 90) * Math.PI / 180
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) }
}
const arc = (a1, a2, r) => {
  const p1 = polar(a1, r)
  const p2 = polar(a2, r)
  const large = a2 - a1 > 180 ? 1 : 0
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`
}
const trackPath = computed(() => arc(START, START + SWEEP, 40))
const valuePath = computed(() => arc(START, angle.value, 40))
const indicatorOuter = computed(() => polar(angle.value, 24))
const indicatorInner = computed(() => polar(angle.value, 11))

// drag to change - up OR right increases, down OR left decreases
const dragging = ref(false)
let startX = 0
let startY = 0
let startVal = 0

const onPointerDown = (e) => {
  if (props.disabled) return
  startX = e.clientX
  startY = e.clientY
  startVal = props.modelValue
  dragging.value = true
  e.currentTarget.setPointerCapture(e.pointerId)
}
const onPointerMove = (e) => {
  if (!dragging.value) return
  e.preventDefault()
  const dy = startY - e.clientY // up = increase
  const dx = e.clientX - startX // right = increase
  emit("update:modelValue", snap(startVal + ((dy + dx) / 150) * range.value))
}
const onPointerUp = (e) => {
  if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
    e.currentTarget.releasePointerCapture(e.pointerId)
  }
  dragging.value = false
}
const onKeydown = (e) => {
  if (props.disabled) return
  if (e.key === "ArrowUp" || e.key === "ArrowRight") {
    e.preventDefault(); emit("update:modelValue", snap(props.modelValue + props.step))
  } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
    e.preventDefault(); emit("update:modelValue", snap(props.modelValue - props.step))
  } else if (e.key === "Home") {
    e.preventDefault(); emit("update:modelValue", props.min)
  } else if (e.key === "End") {
    e.preventDefault(); emit("update:modelValue", props.max)
  }
}
</script>

<template>
  <div class="pc-knob-wrap">
    <div
      :class="['pc-knob', { 'pc-knob--dragging': dragging, 'pc-knob--disabled': disabled }]"
      :style="{ width: `${size}px`, height: `${size}px` }"
      :tabindex="disabled ? -1 : 0"
      role="slider"
      :aria-valuenow="modelValue"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-label="label || undefined"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @keydown="onKeydown"
    >
      <svg viewBox="0 0 100 100">
        <path :d="trackPath" class="pc-knob__track" />
        <path :d="valuePath" class="pc-knob__value-arc" />
        <circle cx="50" cy="50" r="30" class="pc-knob__body" />
        <line
          :x1="indicatorInner.x" :y1="indicatorInner.y"
          :x2="indicatorOuter.x" :y2="indicatorOuter.y"
          class="pc-knob__indicator"
        />
      </svg>
    </div>
    <div class="pc-knob__readout">
      <div class="pc-knob__value">{{ formatValue(modelValue) }}</div>
      <div v-if="label" class="pc-knob__label">{{ label }}</div>
    </div>
  </div>
</template>

<style scoped>
.pc-knob-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.pc-knob {
  outline: none;
  cursor: grab;
  border-radius: 50%;
  touch-action: none;
}
.pc-knob--dragging { cursor: grabbing; }
.pc-knob--disabled { cursor: not-allowed; opacity: 0.5; }
.pc-knob svg { width: 100%; height: 100%; display: block; }

.pc-knob__track {
  fill: none;
  stroke: var(--ink-08);
  stroke-width: 7;
  stroke-linecap: round;
}
.pc-knob__value-arc {
  fill: none;
  stroke: var(--midnight);
  stroke-width: 7;
  stroke-linecap: round;
}
.pc-knob__body {
  fill: var(--paper);
  stroke: var(--ink-08);
  stroke-width: 1.5;
}
.pc-knob__indicator {
  stroke: var(--midnight);
  stroke-width: 3.5;
  stroke-linecap: round;
}
.pc-knob:focus-visible { box-shadow: var(--focus-ring); }
.pc-knob:focus-visible .pc-knob__body { stroke: var(--midnight); }

.pc-knob__readout { text-align: center; }
.pc-knob__value {
  font-family: var(--display);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.pc-knob__label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
  margin-top: 2px;
}
</style>
