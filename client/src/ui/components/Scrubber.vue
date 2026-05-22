<script setup>
import { ref, computed } from "vue"

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  step: { type: Number, default: 1 },
  // pixels of horizontal drag per `step` of change
  sensitivity: { type: Number, default: 4 },
  precision: { type: Number, default: 0 },
  suffix: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  size: { type: String, default: "md" }, // sm | md | lg
  label: { type: String, default: "" },
})
const emit = defineEmits(["update:modelValue"])

const inputRef = ref(null)
const dragging = ref(false)
const focused = ref(false)

let startX = 0
let startVal = 0
let moved = false

const clamp = (v) => {
  if (props.min != null) v = Math.max(props.min, v)
  if (props.max != null) v = Math.min(props.max, v)
  return v
}
const round = (v) => {
  const p = Math.pow(10, props.precision)
  return Math.round(v * p) / p
}

// while not editing, show the value with its suffix; while editing, raw number
const display = computed(() => {
  if (focused.value) return String(props.modelValue)
  return `${props.modelValue}${props.suffix}`
})

let pointerActive = false

const onPointerDown = (e) => {
  if (props.disabled) return
  // already editing - let the native input handle clicks / caret
  if (focused.value) return
  // suppress the native focus + text-selection so a drag is a clean scrub
  e.preventDefault()
  pointerActive = true
  moved = false
  dragging.value = false
  startX = e.clientX
  startVal = props.modelValue
  e.currentTarget.setPointerCapture(e.pointerId)
}
const onPointerMove = (e) => {
  if (!pointerActive) return
  const dx = e.clientX - startX
  if (!moved && Math.abs(dx) > 3) {
    moved = true
    dragging.value = true
  }
  if (!dragging.value) return
  e.preventDefault()
  const delta = (dx / props.sensitivity) * props.step
  emit("update:modelValue", clamp(round(startVal + delta)))
}
const onPointerUp = (e) => {
  if (!pointerActive) return
  pointerActive = false
  if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
    e.currentTarget.releasePointerCapture(e.pointerId)
  }
  if (moved) {
    // a real drag - make sure we didn't end up focused
    if (focused.value) inputRef.value?.blur()
  } else {
    // a press with no drag is a click - focus the input so it can be typed
    inputRef.value?.focus()
    inputRef.value?.select()
  }
  dragging.value = false
}

const onFocus = () => { focused.value = true }
const onBlur = (e) => {
  focused.value = false
  const v = parseFloat(e.target.value)
  if (!isNaN(v)) emit("update:modelValue", clamp(round(v)))
}
const onKeydown = (e) => {
  if (e.key === "ArrowUp") {
    e.preventDefault()
    emit("update:modelValue", clamp(round(props.modelValue + props.step)))
  } else if (e.key === "ArrowDown") {
    e.preventDefault()
    emit("update:modelValue", clamp(round(props.modelValue - props.step)))
  } else if (e.key === "Enter") {
    inputRef.value?.blur()
  }
}
</script>

<template>
  <div
    :class="[
      'pc-scrubber',
      `pc-scrubber--${size}`,
      {
        'pc-scrubber--dragging': dragging,
        'pc-scrubber--editing': focused,
        'pc-scrubber--disabled': disabled,
        'pc-scrubber--invalid': invalid,
      },
    ]"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <span v-if="label" class="pc-scrubber__label">{{ label }}</span>
    <input
      ref="inputRef"
      class="pc-scrubber__input"
      :value="display"
      :disabled="disabled"
      inputmode="decimal"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    />
  </div>
</template>

<style scoped>
.pc-scrubber {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: max-content;
  height: var(--control-h);
  padding: 0 10px;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background: var(--paper);
  cursor: ew-resize;
  user-select: none;
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
  box-sizing: border-box;
}
.pc-scrubber--sm { height: var(--control-h-sm); padding: 0 8px; }
.pc-scrubber--lg { height: var(--control-h-lg); padding: 0 12px; }
.pc-scrubber:hover:not(.pc-scrubber--disabled):not(:focus-within) { border-color: var(--ink-20); }
.pc-scrubber:focus-within { border-color: var(--midnight); box-shadow: var(--focus-ring); cursor: text; }
.pc-scrubber--dragging { border-color: var(--midnight); background: var(--ink-04); }
.pc-scrubber--invalid { border-color: var(--status-failed); }
.pc-scrubber--invalid:focus-within { box-shadow: var(--focus-ring-danger); }
.pc-scrubber--disabled { background: var(--ink-04); opacity: 0.6; cursor: not-allowed; }

.pc-scrubber__label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
  pointer-events: none;
}
.pc-scrubber__input {
  width: 56px;
  border: 0;
  outline: none;
  background: transparent;
  font-family: var(--display);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.14px;
  color: var(--ink);
  cursor: inherit;
  min-width: 0;
  /* no text selection while scrubbing; restored only while editing */
  user-select: none;
}
.pc-scrubber--editing .pc-scrubber__input { user-select: text; }
.pc-scrubber--sm .pc-scrubber__input { font-size: 13px; width: 48px; }
.pc-scrubber--lg .pc-scrubber__input { font-size: 15px; width: 64px; }
</style>
