<script setup>
const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, default: () => [] }, // [{ value, label }] or [string]
  placeholder: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: "md" }, // sm | md | lg
  id: { type: String, default: undefined },
})
const emit = defineEmits(["update:modelValue"])
const normalize = (o) => (typeof o === "object" && o !== null) ? o : { value: o, label: String(o) }
const onChange = (e) => emit("update:modelValue", e.target.value)
</script>

<template>
  <select
    :id="id"
    :class="['pc-select', `pc-select--${size}`]"
    :value="modelValue ?? ''"
    :disabled="disabled"
    @change="onChange"
  >
    <option v-if="placeholder !== undefined" value="" disabled>{{ placeholder }}</option>
    <option v-for="opt in options.map(normalize)" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>

<style scoped>
.pc-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background-color: var(--paper);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'><path d='M1 1L5 5L9 1' stroke='%23000' stroke-width='1.4' stroke-linecap='square'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding: 0 32px 0 12px;
  height: var(--control-h);
  font-family: var(--display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.14px;
  line-height: 1.2;
  color: var(--ink);
  cursor: pointer;
  outline: none;
  transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
}
.pc-select:hover:not(:disabled):not(:focus) { background-color: var(--ink-04); border-color: var(--ink-20); }
.pc-select:focus { border-color: var(--midnight); box-shadow: var(--focus-ring); }
.pc-select:disabled { color: var(--ink-40); cursor: not-allowed; }
.pc-select option { font-size: 14px; padding: 8px; }
.pc-select--sm { padding: 0 28px 0 10px; height: var(--control-h-sm); font-size: 13px; }
.pc-select--lg { padding: 0 36px 0 14px; height: var(--control-h-lg); font-size: 15px; }
</style>
