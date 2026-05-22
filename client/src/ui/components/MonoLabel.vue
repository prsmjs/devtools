<script setup>
defineProps({
  size: { type: String, default: "sm" }, // xs | sm | md | lg
})
</script>

<template>
  <span :class="['pc-mono-label', `pc-mono-label--${size}`]"><slot /></span>
</template>

<style scoped>
.pc-mono-label {
  font-family: var(--mono);
  text-transform: uppercase;
  font-weight: 500;
}
.pc-mono-label--xs { font-size: 10px; letter-spacing: 0.08em; }
.pc-mono-label--sm { font-size: 11px; letter-spacing: 0.06em; }
.pc-mono-label--md { font-size: 13px; letter-spacing: 0.05em; }
.pc-mono-label--lg { font-size: 16px; letter-spacing: 0.04em; }
</style>
