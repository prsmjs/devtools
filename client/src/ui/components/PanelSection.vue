<script setup>
defineProps({
  label: { type: String, default: "" },
  // remove default padding for sections that manage their own
  flush: { type: Boolean, default: false },
  // soft pastel wash (decoration only, per design spec)
  gradient: { type: Boolean, default: false },
  // surface tone: default (paper) | muted (tinted ink-04, good for footers)
  tone: { type: String, default: "default" },
})
</script>

<template>
  <section
    :class="[
      'pc-panel__section',
      `pc-panel__section--tone-${tone}`,
      { 'pc-panel__section--flush': flush, 'pc-panel__section--gradient': gradient },
    ]"
  >
    <div v-if="label || $slots.label || $slots.action" class="pc-panel__section-head">
      <div v-if="label || $slots.label" class="pc-panel__section-label">
        <slot name="label">{{ label }}</slot>
      </div>
      <div v-if="$slots.action" class="pc-panel__section-action"><slot name="action" /></div>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.pc-panel__section {
  padding: 18px 24px;
  border-top: 1px solid var(--ink-08);
  position: relative;
}
/* no divider above the first section when the panel has no header */
.pc-panel__section:first-child { border-top: 0; }
.pc-panel__section--flush { padding: 0; }

.pc-panel__section--tone-muted { background: var(--ink-04); }

.pc-panel__section--gradient {
  background:
    radial-gradient(70% 130% at 0% 0%, rgba(189, 187, 255, 0.22), transparent 70%),
    radial-gradient(60% 120% at 100% 0%, rgba(255, 214, 245, 0.13), transparent 70%);
}
.pc-panel__section--gradient.pc-panel__section--tone-muted {
  background:
    radial-gradient(70% 130% at 0% 0%, rgba(189, 187, 255, 0.22), transparent 70%),
    var(--ink-04);
}

.pc-panel__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.pc-panel__section-label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-60);
}
.pc-panel__section-action { flex-shrink: 0; }
</style>
