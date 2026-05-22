<script setup>
const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  rows: { type: Number, default: 4 },
  id: { type: String, default: undefined },
})
const emit = defineEmits(["update:modelValue"])
const onInput = (e) => emit("update:modelValue", e.target.value)
</script>

<template>
  <textarea
    :id="id"
    :class="['pc-textarea', { 'pc-textarea--invalid': invalid }]"
    :value="modelValue"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    @input="onInput"
  />
</template>

<style scoped>
.pc-textarea {
  width: 100%;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  padding: 8px 10px;
  font-size: 14px;
  background: var(--paper);
  color: var(--ink);
  outline: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
  font-family: var(--display);
  letter-spacing: -0.14px;
  line-height: 1.4;
  resize: vertical;
}
.pc-textarea::placeholder { color: var(--ink-40); }
.pc-textarea:hover:not(:disabled):not(:focus) { border-color: var(--ink-20); }
.pc-textarea:focus { border-color: var(--midnight); box-shadow: var(--focus-ring); }
.pc-textarea:disabled { background: var(--ink-04); color: var(--ink-60); cursor: not-allowed; }
.pc-textarea--invalid { border-color: var(--status-failed); }
.pc-textarea--invalid:hover:not(:focus) { border-color: var(--status-failed); }
.pc-textarea--invalid:focus { border-color: var(--status-failed); box-shadow: var(--focus-ring-danger); }
</style>
