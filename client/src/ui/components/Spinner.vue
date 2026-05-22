<script setup>
defineProps({
  size: { type: Number, default: 14 },
  light: { type: Boolean, default: false },
})
</script>

<template>
  <span
    :class="['pc-spinner', { 'pc-spinner--light': light }]"
    :style="{ width: size + 'px', height: size + 'px' }"
  />
</template>

<style scoped>
.pc-spinner {
  display: inline-block;
  border: 2px solid var(--ink-08);
  border-top-color: var(--midnight);
  border-radius: 50%;
  animation: pc-spin 700ms linear infinite;
}
.pc-spinner--light {
  border-color: rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
}
@keyframes pc-spin { to { transform: rotate(360deg); } }
</style>
