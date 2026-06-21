<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  indeterminate: { type: Boolean, default: false },
  id: { type: String, default: undefined },
})
const emit = defineEmits(["update:modelValue"])
const onChange = (e) => emit("update:modelValue", e.target.checked)
</script>

<template>
  <label :class="['pc-check', { 'pc-check--disabled': disabled }]">
    <input
      :id="id"
      type="checkbox"
      class="pc-check__input"
      :checked="modelValue"
      :disabled="disabled"
      :indeterminate.prop="indeterminate"
      @change="onChange"
    />
    <span class="pc-check__box"><span class="pc-check__mark" /></span>
    <span v-if="label || $slots.default" class="pc-check__label"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.pc-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  letter-spacing: -0.14px;
}
.pc-check--disabled { cursor: not-allowed; opacity: 0.5; }
.pc-check__input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
.pc-check__box {
  width: 16px; height: 16px;
  border: 1px solid var(--ink-20);
  border-radius: 3px;
  background: var(--paper);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
}
.pc-check:hover .pc-check__box { border-color: var(--ink-40); }
.pc-check:active:not(.pc-check--disabled) .pc-check__box { background: var(--ink-08); border-color: var(--ink-40); }
.pc-check:active:not(.pc-check--disabled) .pc-check__input:checked + .pc-check__box { background: var(--midnight-active); border-color: var(--midnight-active); }
.pc-check__input:focus-visible + .pc-check__box { box-shadow: var(--focus-ring); border-color: var(--midnight); }
.pc-check__input:checked + .pc-check__box {
  background: var(--midnight);
  border-color: var(--midnight);
}
.pc-check__input:checked + .pc-check__box .pc-check__mark {
  display: block;
  width: 10px; height: 6px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg) translate(1px, -1px);
}
.pc-check__mark { display: none; }
</style>
