<script setup>
import { computed } from "vue"
import Badge from "./Badge.vue"

const props = defineProps({
  monogram: { type: String, default: "" },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  status: { type: String, default: "" },
  statusVariant: { type: String, default: "default" }, // Badge variant
  // metrics: [{ label, value, mono? }]
  metrics: { type: Array, default: () => [] },
  // max metrics per row - extras wrap to the next row
  metricColumns: { type: Number, default: 3 },
  footer: { type: String, default: "" },
  // soft pastel header wash + gradient monogram; false -> muted ink-04 header
  gradient: { type: Boolean, default: true },
  // hover-lift + pointer; renders as <a> when href is set
  interactive: { type: Boolean, default: false },
  href: { type: String, default: null },
  // override the monogram chip's background and text color (any css color)
  monogramBg: { type: String, default: "" },
  monogramColor: { type: String, default: "" },
})

const monogramStyle = computed(() => {
  const s = {}
  if (props.monogramBg) s.background = props.monogramBg
  if (props.monogramColor) s.color = props.monogramColor
  return s
})

const tag = computed(() => props.href ? "a" : "div")
const isInteractive = computed(() => props.interactive || !!props.href)
// never more columns than metrics; extras wrap to a new row
const metricCols = computed(() => Math.min(props.metrics.length || 1, props.metricColumns))
</script>

<template>
  <component
    :is="tag"
    :href="href"
    :class="['pc-entity-card', { 'pc-entity-card--interactive': isInteractive }]"
  >
    <div :class="['pc-entity-card__header', { 'pc-entity-card__header--plain': !gradient }]">
      <slot name="monogram">
        <span
          v-if="monogram"
          :class="['pc-entity-card__monogram', { 'pc-entity-card__monogram--plain': !gradient }]"
          :style="monogramStyle"
        >{{ monogram }}</span>
      </slot>
      <div class="pc-entity-card__status">
        <slot name="status">
          <Badge v-if="status" :variant="statusVariant">{{ status }}</Badge>
        </slot>
      </div>
    </div>

    <div class="pc-entity-card__body">
      <h3 v-if="title" class="pc-entity-card__title">{{ title }}</h3>
      <div v-if="subtitle" class="pc-entity-card__subtitle">{{ subtitle }}</div>

      <template v-if="metrics.length">
        <hr class="pc-entity-card__rule" />
        <dl class="pc-entity-card__metrics" :style="{ '--pc-ec-cols': metricCols }">
          <div v-for="(m, i) in metrics" :key="i" class="pc-entity-card__metric">
            <dt class="pc-entity-card__metric-label">{{ m.label }}</dt>
            <dd :class="['pc-entity-card__metric-value', { 'pc-entity-card__metric-value--mono': m.mono }]">
              {{ m.value }}
            </dd>
          </div>
        </dl>
      </template>

      <template v-if="footer || $slots.footer">
        <hr class="pc-entity-card__rule" />
        <div class="pc-entity-card__footer">
          <slot name="footer">{{ footer }}</slot>
        </div>
      </template>
    </div>
  </component>
</template>

<style scoped>
.pc-entity-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  box-shadow: var(--shadow-soft);
  color: var(--ink);
  text-decoration: none;
}
.pc-entity-card--interactive {
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease;
}
.pc-entity-card--interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}
/* press - settles back down so it feels like it's being pushed */
.pc-entity-card--interactive:active {
  transform: translateY(0);
  box-shadow: var(--shadow-soft);
}

/* header - soft pastel wash, monogram left, status right */
.pc-entity-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  min-height: 96px;
  background:
    radial-gradient(80% 70% at 0% 0%, rgba(189, 187, 255, 0.35), transparent 60%),
    radial-gradient(64% 70% at 100% 100%, rgba(255, 214, 245, 0.30), transparent 60%);
}
.pc-entity-card__header--plain { background: var(--ink-04); }

.pc-entity-card__monogram {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--display);
  font-weight: 500;
  font-size: 16px;
  letter-spacing: -0.3px;
  color: var(--midnight);
  background: color-mix(in srgb, var(--lavender) 55%, white);
}
.pc-entity-card__monogram--plain {
  background: var(--paper);
  box-shadow: inset 0 0 0 1px var(--ink-08);
  color: var(--ink-60);
}
.pc-entity-card__status { flex-shrink: 0; }

/* body */
.pc-entity-card__body { padding: 20px 24px 24px; }
.pc-entity-card__title {
  margin: 0;
  font-family: var(--display);
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.56px;
  line-height: 1.15;
  color: var(--ink);
}
.pc-entity-card__subtitle {
  margin-top: 4px;
  font-size: 15px;
  color: var(--ink-60);
  letter-spacing: -0.15px;
}

.pc-entity-card__rule {
  border: 0;
  height: 1px;
  background: var(--ink-08);
  margin: 16px 0;
}

.pc-entity-card__metrics {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(var(--pc-ec-cols), 1fr);
  gap: 18px 16px;
}
/* subgrid: every metric shares a label row and a value row, so values stay
   aligned across the row even when a label wraps to two (or more) lines */
.pc-entity-card__metric {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 2;
  row-gap: 6px;
  min-width: 0;
}
.pc-entity-card__metric-label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
  line-height: 1.3;
}
.pc-entity-card__metric-value {
  margin: 0;
  font-family: var(--display);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.4px;
  line-height: 1;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.pc-entity-card__metric-value--mono {
  font-family: var(--mono);
  font-size: 18px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.pc-entity-card__footer {
  font-size: 14px;
  color: var(--ink-60);
  letter-spacing: -0.14px;
}
</style>
