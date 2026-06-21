<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  // shows a spinner inside the thumb and blocks toggling - drive it from an async
  // handler so the switch waits in place before the value (and thumb) flips
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(["update:modelValue"])
// revert the native toggle immediately so the input stays bound to modelValue.
// this lets an async handler hold the thumb in place (showing the spinner) until
// it decides to flip modelValue, instead of the checkbox visually toggling itself
const onChange = (e) => {
  const next = e.target.checked
  e.target.checked = props.modelValue
  emit("update:modelValue", next)
}
</script>

<template>
  <label :class="['pc-switch', { 'pc-switch--disabled': disabled, 'pc-switch--loading': loading }]">
    <input
      type="checkbox"
      class="pc-switch__input"
      :checked="modelValue"
      :disabled="disabled || loading"
      @change="onChange"
    />
    <span class="pc-switch__track">
      <span class="pc-switch__thumb">
        <Transition name="pc-sw-fade">
          <span v-if="loading" class="pc-switch__spinner" aria-hidden="true" />
        </Transition>
      </span>
    </span>
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
.pc-switch--loading { cursor: progress; }
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 160ms ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.pc-switch__input:checked + .pc-switch__track .pc-switch__thumb { transform: translateX(14px); }

/* press: only the thumb reacts - a small uniform dip, staying round */
.pc-switch:active:not(.pc-switch--disabled):not(.pc-switch--loading) .pc-switch__thumb { transform: scale(0.85); }
.pc-switch:active:not(.pc-switch--disabled):not(.pc-switch--loading) .pc-switch__input:checked + .pc-switch__track .pc-switch__thumb { transform: translateX(14px) scale(0.85); }

/* loading spinner lives inside the thumb */
.pc-switch__spinner {
  width: 9px; height: 9px;
  border: 1.5px solid var(--ink-40);
  border-top-color: transparent;
  border-radius: 50%;
  animation: pc-switch-spin 600ms linear infinite;
}
@keyframes pc-switch-spin { to { transform: rotate(360deg); } }

/* the spinner fades in and out */
.pc-sw-fade-enter-active,
.pc-sw-fade-leave-active { transition: opacity 130ms ease; }
.pc-sw-fade-enter-from,
.pc-sw-fade-leave-to { opacity: 0; }
</style>
