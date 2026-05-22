<script setup>
defineProps({
  value: { type: [String, Number], required: true },
  label: { type: String, default: "" },
  caption: { type: String, default: "" },
  size: { type: String, default: "lg" }, // md | lg | xl
})
</script>

<template>
  <div class="pc-stat">
    <div v-if="label" class="pc-stat__label">{{ label }}</div>
    <div :class="['pc-stat__value', `pc-stat__value--${size}`]"><slot name="value">{{ value }}</slot></div>
    <div v-if="caption || $slots.caption" class="pc-stat__caption">
      <slot name="caption">{{ caption }}</slot>
    </div>
  </div>
</template>

<style scoped>
.pc-stat { display: flex; flex-direction: column; gap: 8px; }
.pc-stat__label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-60);
}
.pc-stat__value {
  font-family: var(--display);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.0;
  font-variant-numeric: tabular-nums;
}
.pc-stat__value--md { font-size: 28px; letter-spacing: -0.56px; }
.pc-stat__value--lg { font-size: 48px; letter-spacing: -1.20px; }
.pc-stat__value--xl { font-size: 64px; letter-spacing: -1.92px; }
.pc-stat__caption { font-size: 14px; color: var(--ink-60); line-height: 1.4; }
</style>
