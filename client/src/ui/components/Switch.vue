<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(["update:modelValue"])
const onChange = (e) => emit("update:modelValue", e.target.checked)
</script>

<template>
  <label :class="['pc-switch', { 'pc-switch--disabled': disabled }]">
    <input
      type="checkbox"
      class="pc-switch__input"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    />
    <span class="pc-switch__track"><span class="pc-switch__thumb" /></span>
    <span v-if="label || $slots.default" class="pc-switch__label"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.pc-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  letter-spacing: -0.14px;
}
.pc-switch--disabled { cursor: not-allowed; opacity: 0.5; }
.pc-switch__input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
.pc-switch__track {
  position: relative;
  width: 32px; height: 18px;
  background: var(--ink-20);
  border-radius: 999px;
  transition: background 160ms ease, box-shadow 140ms ease;
  flex-shrink: 0;
}
.pc-switch:hover .pc-switch__track { background: var(--ink-40); }
.pc-switch__input:checked + .pc-switch__track { background: var(--midnight); }
.pc-switch:hover .pc-switch__input:checked + .pc-switch__track { background: var(--midnight-hover); }
.pc-switch__input:focus-visible + .pc-switch__track { box-shadow: var(--focus-ring); }
.pc-switch__thumb {
  position: absolute;
  top: 2px; left: 2px;
  width: 14px; height: 14px;
  background: var(--paper);
  border-radius: 50%;
  transition: transform 160ms ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.pc-switch__input:checked + .pc-switch__track .pc-switch__thumb { transform: translateX(14px); }
</style>
