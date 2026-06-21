<script setup>
defineProps({
  size: { type: String, default: "sm" }, // xs | sm | md
})
</script>

<template>
  <div :class="['pc-section-label', `pc-section-label--${size}`]">
    <slot />
  </div>
</template>

<style scoped>
.pc-section-label {
  font-family: var(--mono);
  text-transform: uppercase;
  font-weight: 500;
  color: var(--ink-60);
}
.pc-section-label--xs { font-size: 10px; letter-spacing: 0.08em; }
.pc-section-label--sm { font-size: 11px; letter-spacing: 0.08em; }
.pc-section-label--md { font-size: 13px; letter-spacing: 0.06em; }
</style>
