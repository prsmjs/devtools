<script setup>
import {
  NumberFieldRoot,
  NumberFieldInput,
  NumberFieldIncrement,
  NumberFieldDecrement,
} from "reka-ui"

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  step: { type: Number, default: 1 },
  disabled: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  size: { type: String, default: "md" }, // sm | md | lg
  placeholder: { type: String, default: "" },
})
const emit = defineEmits(["update:modelValue"])
</script>

<template>
  <NumberFieldRoot
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v)"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :class="['pc-num', `pc-num--${size}`, { 'pc-num--invalid': invalid, 'pc-num--disabled': disabled }]"
  >
    <NumberFieldDecrement class="pc-num__btn" aria-label="Decrease">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 6h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </NumberFieldDecrement>
    <NumberFieldInput class="pc-num__input" :placeholder="placeholder" />
    <NumberFieldIncrement class="pc-num__btn" aria-label="Increase">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </NumberFieldIncrement>
  </NumberFieldRoot>
</template>

<style scoped>
.pc-num {
  display: inline-flex;
  align-items: stretch;
  width: max-content;
  height: var(--control-h);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background: var(--paper);
  overflow: hidden;
  transition: border-color 140ms ease, box-shadow 140ms ease;
  box-sizing: border-box;
}
.pc-num--sm { height: var(--control-h-sm); }
.pc-num--lg { height: var(--control-h-lg); }
.pc-num:hover:not(.pc-num--disabled):not(:focus-within) { border-color: var(--ink-20); }
.pc-num:focus-within { border-color: var(--midnight); box-shadow: var(--focus-ring); }
.pc-num--invalid { border-color: var(--status-failed); }
.pc-num--invalid:focus-within { border-color: var(--status-failed); box-shadow: var(--focus-ring-danger); }
.pc-num--disabled { background: var(--ink-04); opacity: 0.7; }

.pc-num__input {
  width: 64px;
  border: 0;
  outline: none;
  background: transparent;
  text-align: center;
  font-family: var(--display);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.14px;
  color: var(--ink);
  min-width: 0;
}
.pc-num--sm .pc-num__input { width: 52px; font-size: 13px; }
.pc-num--lg .pc-num__input { width: 76px; font-size: 15px; }
.pc-num__input::placeholder { color: var(--ink-40); }

.pc-num__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-h);
  flex-shrink: 0;
  background: transparent;
  border: 0;
  color: var(--ink-60);
  cursor: pointer;
  outline: none;
  transition: background 120ms ease, color 120ms ease;
}
.pc-num--sm .pc-num__btn { width: var(--control-h-sm); }
.pc-num--lg .pc-num__btn { width: var(--control-h-lg); }
.pc-num__btn:hover:not(:disabled) { background: var(--ink-04); color: var(--ink); }
.pc-num__btn:active:not(:disabled) { background: var(--ink-08); }
.pc-num__btn:disabled { color: var(--ink-20); cursor: not-allowed; }
.pc-num__btn:focus-visible { box-shadow: inset var(--focus-ring); }
</style>
