<script setup>
const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, required: true }, // [{ value, label, icon?, disabled? }] or [string]
  size: { type: String, default: "md" }, // sm | md
})
const emit = defineEmits(["update:modelValue"])
const normalize = (o) => (typeof o === "object" && o !== null) ? o : { value: o, label: String(o) }
</script>

<template>
  <div :class="['pc-seg', `pc-seg--${size}`]" role="tablist">
    <button
      v-for="opt in options.map(normalize)"
      :key="opt.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      :disabled="opt.disabled"
      :class="['pc-seg__btn', { 'pc-seg__btn--active': modelValue === opt.value }]"
      @click="emit('update:modelValue', opt.value)"
    >
      <span v-if="opt.icon" class="pc-seg__icon">{{ opt.icon }}</span>
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.pc-seg {
  display: inline-flex;
  background: var(--ink-04);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  padding: 3px;
  gap: 2px;
  height: var(--control-h);
  box-sizing: border-box;
}
.pc-seg__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 3px;
  font-family: var(--display);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.13px;
  color: var(--ink-60);
  background: transparent;
  outline: none;
  transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease;
  white-space: nowrap;
  line-height: 1;
}
.pc-seg__btn:hover:not(:disabled):not(.pc-seg__btn--active) { color: var(--ink); }
.pc-seg__btn:focus-visible { box-shadow: var(--focus-ring); }
.pc-seg__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pc-seg__btn--active {
  background: var(--paper);
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(1, 1, 32, 0.08);
}
.pc-seg--sm { height: var(--control-h-sm); padding: 2px; }
.pc-seg--sm .pc-seg__btn { padding: 0 8px; font-size: 12px; }
.pc-seg__icon { font-size: 13px; }
</style>
