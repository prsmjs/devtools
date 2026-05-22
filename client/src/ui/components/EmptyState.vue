<script setup>
defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  icon: { type: String, default: "" },
})
</script>

<template>
  <div class="pc-empty">
    <div v-if="icon" class="pc-empty__icon">{{ icon }}</div>
    <div v-if="title" class="pc-empty__title">{{ title }}</div>
    <div v-if="description" class="pc-empty__desc">{{ description }}</div>
    <div v-if="$slots.default" class="pc-empty__actions"><slot /></div>
  </div>
</template>

<style scoped>
.pc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
  color: var(--ink-60);
}
.pc-empty__icon { font-size: 28px; margin-bottom: 4px; opacity: 0.5; }
.pc-empty__title {
  font-family: var(--display);
  font-size: 18px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.2px;
}
.pc-empty__desc { font-size: 14px; max-width: 380px; }
.pc-empty__actions { margin-top: 12px; display: flex; gap: 8px; }
</style>
