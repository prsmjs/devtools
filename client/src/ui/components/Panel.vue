<script setup>
defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  // soft pastel wash behind the header (decoration only, per design spec)
  gradient: { type: Boolean, default: false },
  elevated: { type: Boolean, default: false },
  // accent border - signals state (e.g. lavender = action required)
  accent: { type: String, default: "none" }, // none | lavender
})
</script>

<template>
  <div :class="['pc-panel', `pc-panel--accent-${accent}`, { 'pc-panel--elevated': elevated }]">
    <header
      v-if="title || description || $slots.header"
      :class="['pc-panel__header', { 'pc-panel__header--gradient': gradient }]"
    >
      <div class="pc-panel__header-main">
        <slot name="header">
          <h3 v-if="title" class="pc-panel__title">{{ title }}</h3>
          <p v-if="description" class="pc-panel__description">{{ description }}</p>
        </slot>
      </div>
      <div v-if="$slots.aside" class="pc-panel__aside"><slot name="aside" /></div>
    </header>
    <slot />
  </div>
</template>

<style scoped>
.pc-panel {
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  overflow: hidden;
}
.pc-panel--elevated { box-shadow: var(--shadow-soft); }
.pc-panel--accent-lavender { border-color: var(--lavender); }

.pc-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
}
.pc-panel__header--gradient {
  background:
    radial-gradient(80% 120% at 0% 0%, rgba(189, 187, 255, 0.20), transparent 72%),
    radial-gradient(70% 110% at 100% 0%, rgba(255, 214, 245, 0.14), transparent 72%);
}
.pc-panel__header-main { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pc-panel__aside { flex-shrink: 0; }

.pc-panel__title {
  margin: 0;
  font-family: var(--display);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.4px;
  line-height: 1.15;
  color: var(--ink);
}
.pc-panel__description {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  letter-spacing: -0.15px;
  color: var(--ink-60);
}
</style>
