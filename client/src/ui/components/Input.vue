<script setup>
import { computed, ref } from "vue"

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  size: { type: String, default: "md" }, // sm | md | lg
  id: { type: String, default: undefined },
})

const emit = defineEmits(["update:modelValue"])
const onInput = (e) => emit("update:modelValue", e.target.value)

const inputRef = ref(null)
const focus = () => inputRef.value?.focus()
const select = () => inputRef.value?.select()
defineExpose({ focus, select, el: inputRef })

const cls = computed(() => [
  "pc-input",
  `pc-input--${props.size}`,
  { "pc-input--invalid": props.invalid },
])
</script>

<template>
  <input
    :id="id"
    ref="inputRef"
    :class="cls"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    @input="onInput"
  />
</template>

<style scoped>
.pc-input {
  width: 100%;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  padding: 0 12px;
  height: var(--control-h);
  font-size: 14px;
  background: var(--paper);
  color: var(--ink);
  outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
  font-family: var(--display);
  letter-spacing: -0.14px;
  line-height: 1.2;
}
.pc-input::placeholder { color: var(--ink-40); }
.pc-input:hover:not(:disabled):not(:focus) { border-color: var(--ink-20); }
.pc-input:focus { border-color: var(--midnight); box-shadow: var(--focus-ring); }
.pc-input:disabled { background: var(--ink-04); color: var(--ink-60); cursor: not-allowed; }
.pc-input--sm { padding: 0 10px; height: var(--control-h-sm); font-size: 13px; }
.pc-input--lg { padding: 0 14px; height: var(--control-h-lg); font-size: 15px; }
.pc-input--invalid { border-color: var(--status-failed); }
.pc-input--invalid:hover:not(:focus) { border-color: var(--status-failed); }
.pc-input--invalid:focus { border-color: var(--status-failed); box-shadow: var(--focus-ring-danger); }
</style>
