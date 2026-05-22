<script setup>
defineProps({
  padded: { type: Boolean, default: false },
  elevated: { type: Boolean, default: false },
  dark: { type: Boolean, default: false },
  interactive: { type: Boolean, default: false },
  radius: { type: String, default: "comfy" }, // sharp | comfy
})
</script>

<template>
  <div :class="[
    'pc-card',
    `pc-card--${radius}`,
    { 'pc-card--padded': padded, 'pc-card--elevated': elevated, 'pc-card--dark': dark, 'pc-card--interactive': interactive }
  ]">
    <slot />
  </div>
</template>

<style scoped>
.pc-card {
  background: var(--paper);
  border: 1px solid var(--ink-08);
}
.pc-card--sharp { border-radius: var(--radius-sharp); }
.pc-card--comfy { border-radius: var(--radius-comfy); }
.pc-card--padded { padding: 24px; }
.pc-card--elevated { box-shadow: var(--shadow-soft); }
.pc-card--dark {
  background: var(--midnight);
  color: var(--paper-on-dark);
  border-color: var(--paper-on-dark-12);
}
.pc-card--interactive { cursor: pointer; transition: box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease; }
.pc-card--interactive:hover { box-shadow: var(--shadow-lift); border-color: var(--ink-20); transform: translateY(-1px); }
.pc-card--interactive:active { transform: translateY(0); box-shadow: var(--shadow-medium); }
.pc-card--dark.pc-card--interactive:hover { border-color: var(--paper-on-dark-40); }
</style>
