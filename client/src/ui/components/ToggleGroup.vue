<script setup>
import { ToggleGroupRoot, ToggleGroupItem } from "reka-ui"

const props = defineProps({
  // single mode: value or null; multiple mode: array of values
  modelValue: { type: [String, Number, Array, null], default: null },
  options: { type: Array, required: true }, // [{ value, label?, icon?, disabled? }] or [string]
  multiple: { type: Boolean, default: false },
  size: { type: String, default: "md" }, // sm | md | lg
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(["update:modelValue"])

const normalize = (o) => (typeof o === "object" && o !== null) ? o : { value: o, label: String(o) }
</script>

<template>
  <ToggleGroupRoot
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v)"
    :type="multiple ? 'multiple' : 'single'"
    :disabled="disabled"
    :rovingFocus="true"
    :class="['pc-toggrp', `pc-toggrp--${size}`]"
  >
    <ToggleGroupItem
      v-for="opt in options.map(normalize)"
      :key="opt.value"
      :value="opt.value"
      :disabled="opt.disabled"
      class="pc-toggrp__item"
    >
      <span v-if="opt.icon" class="pc-toggrp__icon">{{ opt.icon }}</span>
      <span v-if="opt.label">{{ opt.label }}</span>
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<style scoped>
.pc-toggrp {
  display: inline-flex;
  width: max-content;
}
.pc-toggrp__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: var(--control-h);
  padding: 0 12px;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-right-width: 0;
  font-family: var(--display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.14px;
  color: var(--ink-60);
  cursor: pointer;
  outline: none;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
  white-space: nowrap;
}
.pc-toggrp__item:first-child { border-top-left-radius: var(--radius-sharp); border-bottom-left-radius: var(--radius-sharp); }
.pc-toggrp__item:last-child { border-right-width: 1px; border-top-right-radius: var(--radius-sharp); border-bottom-right-radius: var(--radius-sharp); }

.pc-toggrp__item:hover:not(:disabled):not([data-state="on"]) { background: var(--ink-04); color: var(--ink); }
.pc-toggrp__item:focus-visible { box-shadow: var(--focus-ring); z-index: 1; }
.pc-toggrp__item[data-state="on"] {
  background: var(--midnight);
  border-color: var(--midnight);
  color: var(--paper-on-dark);
}
/* keep the shared border crisp when an active item sits next to an inactive one */
.pc-toggrp__item[data-state="on"] + .pc-toggrp__item { border-left-color: var(--midnight); }
.pc-toggrp__item[data-disabled] { opacity: 0.5; cursor: not-allowed; }

.pc-toggrp--sm .pc-toggrp__item { height: var(--control-h-sm); padding: 0 10px; font-size: 13px; }
.pc-toggrp--lg .pc-toggrp__item { height: var(--control-h-lg); padding: 0 16px; font-size: 15px; }

.pc-toggrp__icon { font-size: 14px; }
</style>
