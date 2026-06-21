<script setup>
defineProps({
  // default | active | warning | paused | failed | draft | solid
  variant: { type: String, default: "default" },
  size: { type: String, default: "sm" }, // sm | md
  dot: { type: Boolean, default: false },
})
</script>

<template>
  <span :class="['pc-badge', `pc-badge--${variant}`, `pc-badge--${size}`, { 'pc-badge--dot': dot }]">
    <slot />
  </span>
</template>

<style scoped>
.pc-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-sharp);
  background: var(--ink-04);
  border: 1px solid var(--ink-08);
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.2;
  white-space: nowrap;
}
.pc-badge--sm { padding: 3px 8px; font-size: 11px; }
.pc-badge--md { padding: 6px 12px; font-size: 12px; letter-spacing: 0.06em; }

.pc-badge--dot::before {
  content: "";
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  display: block;
}
.pc-badge--active { color: var(--status-active); background: var(--status-active-bg); border-color: transparent; }
.pc-badge--warning { color: var(--status-warning); background: var(--status-warning-bg); border-color: transparent; }
.pc-badge--paused { color: var(--status-paused); background: var(--status-paused-bg); border-color: transparent; }
.pc-badge--failed { color: var(--status-failed); background: var(--status-failed-bg); border-color: transparent; }
.pc-badge--draft { color: var(--status-draft); background: var(--status-draft-bg); border-color: transparent; }
/* solid - filled midnight, white text (the high-signal tag) */
.pc-badge--solid {
  background: var(--midnight);
  border-color: var(--midnight);
  color: var(--paper-on-dark);
}
</style>
