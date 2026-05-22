<script setup>
defineProps({
  size: { type: String, default: "xl" }, // lg | xl
  as: { type: String, default: "h1" },
})
</script>

<template>
  <component :is="as" :class="['pc-display', `pc-display--${size}`]"><slot /></component>
</template>

<style scoped>
.pc-display {
  font-family: var(--display);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin: 0;
}
.pc-display--lg { font-size: 48px; letter-spacing: -1.20px; line-height: 1.05; }
.pc-display--xl { font-size: 64px; letter-spacing: -1.92px; line-height: 1.00; }
</style>
