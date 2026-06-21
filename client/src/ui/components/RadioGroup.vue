<script setup>
const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, required: true }, // [{value, label}] or [string]
  name: { type: String, default: () => `pc-radio-${Math.random().toString(36).slice(2, 8)}` },
  direction: { type: String, default: "vertical" }, // vertical | horizontal
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(["update:modelValue"])
const normalize = (o) => (typeof o === "object" && o !== null) ? o : { value: o, label: String(o) }
</script>

<template>
  <div :class="['pc-radio-group', `pc-radio-group--${direction}`]">
    <label
      v-for="opt in options.map(normalize)"
      :key="opt.value"
      :class="['pc-radio', { 'pc-radio--checked': modelValue === opt.value, 'pc-radio--disabled': disabled }]"
    >
      <input
        type="radio"
        class="pc-radio__input"
        :name="name"
        :value="opt.value"
        :checked="modelValue === opt.value"
        :disabled="disabled"
        @change="emit('update:modelValue', opt.value)"
      />
      <span class="pc-radio__dot" />
      <span class="pc-radio__label">{{ opt.label }}</span>
    </label>
  </div>
</template>

<style scoped>
.pc-radio-group { display: flex; gap: 12px; }
.pc-radio-group--vertical { flex-direction: column; }
.pc-radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  letter-spacing: -0.14px;
}
.pc-radio--disabled { cursor: not-allowed; opacity: 0.5; }
.pc-radio__input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
.pc-radio__dot {
  width: 16px; height: 16px;
  border: 1px solid var(--ink-20);
  border-radius: 50%;
  background: var(--paper);
  position: relative;
  transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}
.pc-radio:hover .pc-radio__dot { border-color: var(--ink-40); }
.pc-radio:active:not(.pc-radio--disabled) .pc-radio__dot { border-color: var(--ink-40); background: var(--ink-08); }
.pc-radio--checked:active:not(.pc-radio--disabled) .pc-radio__dot { border-color: var(--midnight-active); }
.pc-radio__input:focus-visible + .pc-radio__dot { box-shadow: var(--focus-ring); border-color: var(--midnight); }
.pc-radio--checked .pc-radio__dot { border-color: var(--midnight); }
.pc-radio--checked .pc-radio__dot::after {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--midnight);
  transition: background 140ms ease;
}
.pc-radio--checked:active:not(.pc-radio--disabled) .pc-radio__dot::after { background: var(--midnight-active); }
</style>
