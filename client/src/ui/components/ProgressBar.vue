<script setup>
import { computed } from "vue"

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  // loading bar with no known value - animates indefinitely
  indeterminate: { type: Boolean, default: false },
  variant: { type: String, default: "default" }, // default | lavender | success | warning | danger
  size: { type: String, default: "md" }, // sm | md | lg
  // > 0 renders a segmented (stepped) bar of N discrete cells
  segments: { type: Number, default: 0 },
  // show the rounded percentage on the right of the header row
  showValue: { type: Boolean, default: false },
  label: { type: String, default: "" },
})

const pct = computed(() => {
  if (props.max <= 0) return 0
  return Math.max(0, Math.min(100, (props.value / props.max) * 100))
})
const rounded = computed(() => Math.round(pct.value))
const filledCount = computed(() => Math.round((pct.value / 100) * props.segments))
</script>

<template>
  <div class="pc-progress">
    <div v-if="label || showValue" class="pc-progress__head">
      <span v-if="label" class="pc-progress__label">{{ label }}</span>
      <span v-if="showValue" class="pc-progress__value">
        {{ indeterminate ? "" : `${rounded}%` }}
      </span>
    </div>

    <!-- indeterminate: a segment sweeping the track -->
    <div
      v-if="indeterminate"
      :class="['pc-progress__track', `pc-progress__track--${size}`, `pc-progress__track--${variant}`]"
      role="progressbar"
    >
      <div class="pc-progress__fill pc-progress__fill--indeterminate" />
    </div>

    <!-- segmented: discrete sharp cells -->
    <div
      v-else-if="segments > 0"
      :class="['pc-progress__segments', `pc-progress__segments--${size}`, `pc-progress__track--${variant}`]"
      role="progressbar"
      :aria-valuenow="rounded"
      :aria-valuemin="0"
      :aria-valuemax="100"
    >
      <span
        v-for="i in segments"
        :key="i"
        :class="['pc-progress__seg', { 'pc-progress__seg--filled': i <= filledCount }]"
      />
    </div>

    <!-- continuous determinate -->
    <div
      v-else
      :class="['pc-progress__track', `pc-progress__track--${size}`, `pc-progress__track--${variant}`]"
      role="progressbar"
      :aria-valuenow="rounded"
      :aria-valuemin="0"
      :aria-valuemax="100"
    >
      <div class="pc-progress__fill" :style="{ width: `${pct}%` }" />
    </div>
  </div>
</template>

<style scoped>
.pc-progress { width: 100%; }

.pc-progress__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 7px;
  min-height: 12px;
}
.pc-progress__label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
}
.pc-progress__value {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.03em;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

/* variant accent - drives the fill / filled-cell color.
   status colors are softened toward white so they sit in the pastel system */
.pc-progress__track,
.pc-progress__segments { --pc-progress-color: var(--midnight); }
.pc-progress__track--lavender { --pc-progress-color: var(--lavender); }
.pc-progress__track--success { --pc-progress-color: color-mix(in srgb, var(--status-active) 68%, white); }
.pc-progress__track--warning { --pc-progress-color: color-mix(in srgb, var(--status-warning) 68%, white); }
.pc-progress__track--danger  { --pc-progress-color: color-mix(in srgb, var(--status-failed) 68%, white); }

/* continuous - a flat, sharp channel (no border, so the dark fill stays crisp) */
.pc-progress__track {
  position: relative;
  width: 100%;
  background: var(--ink-08);
  border-radius: var(--radius-sharp);
  overflow: hidden;
}
.pc-progress__track--sm { height: 8px; }
.pc-progress__track--md { height: 10px; }
.pc-progress__track--lg { height: 14px; }

.pc-progress__fill {
  height: 100%;
  background: var(--pc-progress-color);
  transition: width 320ms cubic-bezier(0.4, 0, 0.2, 1);
}
.pc-progress__fill--indeterminate {
  width: 38%;
  transition: none;
  animation: pc-progress-indet 1.25s ease-in-out infinite;
}
@keyframes pc-progress-indet {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(275%); }
}

/* segmented - discrete sharp cells */
.pc-progress__segments {
  display: flex;
  gap: 3px;
  width: 100%;
}
.pc-progress__seg {
  flex: 1;
  background: var(--ink-08);
  border-radius: 2px;
  transition: background 200ms ease;
}
.pc-progress__segments--sm .pc-progress__seg { height: 8px; }
.pc-progress__segments--md .pc-progress__seg { height: 10px; }
.pc-progress__segments--lg .pc-progress__seg { height: 14px; }
.pc-progress__seg--filled { background: var(--pc-progress-color); }

@media (prefers-reduced-motion: reduce) {
  .pc-progress__fill--indeterminate { animation-duration: 2.4s; }
}
</style>
