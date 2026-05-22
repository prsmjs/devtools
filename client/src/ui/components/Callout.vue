<script setup>
defineProps({
  variant: { type: String, default: "info" }, // info | success | warning | danger | neutral
  eyebrow: { type: String, default: "" },
  title: { type: String, default: "" },
  stripe: { type: Boolean, default: false },
  dismissible: { type: Boolean, default: false },
})
const emit = defineEmits(["dismiss"])
</script>

<template>
  <div :class="['pc-callout', `pc-callout--${variant}`, { 'pc-callout--with-stripe': stripe }]">
    <div v-if="stripe" class="pc-callout__stripe" />
    <div class="pc-callout__body">
      <div v-if="eyebrow" class="pc-callout__eyebrow">{{ eyebrow }}</div>
      <div v-if="title" class="pc-callout__title">{{ title }}</div>
      <div v-if="$slots.default" class="pc-callout__content"><slot /></div>
      <div v-if="$slots.actions" class="pc-callout__actions"><slot name="actions" /></div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="pc-callout__close"
      aria-label="Dismiss"
      @click="emit('dismiss')"
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.pc-callout {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  border-radius: var(--radius-comfy);
  border: 1px solid var(--ink-08);
  background: var(--paper);
  font-size: 14px;
  letter-spacing: -0.14px;
  line-height: 1.5;
  overflow: hidden;
}
.pc-callout--with-stripe { padding-top: 18px; }

.pc-callout__stripe {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}

.pc-callout__body { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }

.pc-callout__eyebrow {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 11px;
  font-weight: 500;
}
.pc-callout__title {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  color: var(--ink);
}
.pc-callout__content { color: var(--ink); }
.pc-callout__actions { margin-top: 8px; display: flex; gap: 8px; }

.pc-callout__close {
  flex-shrink: 0;
  width: 26px; height: 26px;
  border-radius: 999px;
  color: var(--ink-60);
  line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 140ms ease, color 140ms ease, transform 60ms ease;
  outline: none;
  margin: -2px -6px -2px 0;
}
.pc-callout__close:hover { background: var(--ink-04); color: var(--ink); }
.pc-callout__close:active { transform: translateY(0.5px); }
.pc-callout__close:focus-visible { box-shadow: var(--focus-ring); }

/* variants - pastel-tinted backgrounds, colored eyebrow and stripe */
.pc-callout--info {
  background:
    radial-gradient(60% 80% at 0% 0%, rgba(189, 187, 255, 0.22), transparent 70%),
    var(--paper);
  border-color: rgba(189, 187, 255, 0.7);
}
.pc-callout--info .pc-callout__eyebrow { color: var(--status-paused); }
.pc-callout--info .pc-callout__stripe { background: linear-gradient(90deg, #bdbbff, #d6e1ff, #bdbbff); }

.pc-callout--success {
  background:
    radial-gradient(60% 80% at 0% 0%, rgba(189, 187, 255, 0.18), transparent 70%),
    radial-gradient(60% 80% at 100% 100%, rgba(214, 225, 255, 0.20), transparent 70%),
    var(--paper);
  border-color: rgba(44, 122, 78, 0.30);
}
.pc-callout--success .pc-callout__eyebrow { color: var(--status-active); }
.pc-callout--success .pc-callout__stripe { background: linear-gradient(90deg, #bdbbff, #ffd6f5, #d6e1ff); }

.pc-callout--warning {
  background:
    radial-gradient(60% 80% at 0% 0%, rgba(255, 224, 200, 0.45), transparent 70%),
    radial-gradient(60% 80% at 100% 100%, rgba(255, 214, 245, 0.25), transparent 70%),
    var(--paper);
  border-color: rgba(184, 107, 0, 0.30);
}
.pc-callout--warning .pc-callout__eyebrow { color: var(--status-warning); }
.pc-callout--warning .pc-callout__stripe { background: linear-gradient(90deg, #ffd6a8, #ffd6f5, #ffd6a8); }

.pc-callout--danger {
  background:
    radial-gradient(60% 80% at 0% 0%, rgba(252, 228, 226, 0.7), transparent 70%),
    var(--paper);
  border-color: rgba(179, 38, 30, 0.28);
}
.pc-callout--danger .pc-callout__eyebrow { color: var(--status-failed); }
.pc-callout--danger .pc-callout__stripe { background: linear-gradient(90deg, #f8b5b0, #ffd6f5, #f8b5b0); }

.pc-callout--neutral {
  background: var(--paper);
}
.pc-callout--neutral .pc-callout__eyebrow { color: var(--ink-60); }
.pc-callout--neutral .pc-callout__stripe { background: linear-gradient(90deg, var(--ink-20), var(--ink-08), var(--ink-20)); }
</style>
