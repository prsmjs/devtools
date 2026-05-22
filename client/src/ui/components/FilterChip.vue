<script setup>
defineProps({
  label: { type: String, default: "" },
  value: { type: [String, Number, null], default: null },
  active: { type: Boolean, default: false },
  removable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(["click", "remove"])
</script>

<template>
  <span
    :class="['pc-chip', { 'pc-chip--active': active, 'pc-chip--disabled': disabled, 'pc-chip--clickable': !disabled }]"
    role="button"
    tabindex="0"
    @click="!disabled && emit('click')"
    @keydown.enter.prevent="!disabled && emit('click')"
    @keydown.space.prevent="!disabled && emit('click')"
  >
    <span class="pc-chip__label"><slot>{{ label }}</slot></span>
    <span v-if="value !== null && value !== ''" class="pc-chip__value">{{ value }}</span>
    <button
      v-if="removable"
      type="button"
      class="pc-chip__remove"
      aria-label="Remove filter"
      @click.stop="emit('remove')"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    </button>
  </span>
</template>

<style scoped>
.pc-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: var(--control-h);
  border-radius: var(--radius-sharp);
  background: var(--paper);
  border: 1px solid var(--ink-08);
  font-family: var(--display);
  font-size: 13px;
  letter-spacing: -0.13px;
  color: var(--ink);
  outline: none;
  transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  white-space: nowrap;
  user-select: none;
  line-height: 1.2;
}
.pc-chip--clickable { cursor: pointer; }
.pc-chip--clickable:hover { border-color: var(--ink-20); background: var(--ink-04); }
.pc-chip:focus-visible { box-shadow: var(--focus-ring); }
.pc-chip--active {
  background: var(--midnight);
  color: var(--paper-on-dark);
  border-color: var(--midnight);
}
.pc-chip--active:hover { background: var(--midnight-hover); border-color: var(--midnight-hover); }
.pc-chip--disabled { opacity: 0.5; cursor: not-allowed; }
.pc-chip__label { font-weight: 500; }
.pc-chip__value {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  background: var(--ink-04);
  padding: 2px 5px;
  border-radius: var(--badge-radius);
  color: var(--ink-60);
  line-height: 1.2;
}
.pc-chip--active .pc-chip__value {
  background: rgba(255, 255, 255, 0.15);
  color: var(--paper-on-dark-60);
}
.pc-chip__remove {
  width: 16px; height: 16px;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  color: inherit;
  opacity: 0.6;
  font-size: 14px;
  line-height: 1;
  transition: background 120ms ease, opacity 120ms ease;
}
.pc-chip__remove:hover { background: var(--ink-08); opacity: 1; }
.pc-chip--active .pc-chip__remove:hover { background: rgba(255, 255, 255, 0.18); }
</style>
