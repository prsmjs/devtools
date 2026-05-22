<script setup>
defineProps({
  items: { type: Array, default: () => [] }, // [{ label, value }]
  layout: { type: String, default: "row" }, // row | stack | divided
  labelWidth: { type: String, default: "120px" },
  compact: { type: Boolean, default: false },
  // tinted, padded, rounded container (pairs well with layout="divided")
  boxed: { type: Boolean, default: false },
  // layout="divided" only: show the dashed row separators
  dividers: { type: Boolean, default: true },
})
</script>

<template>
  <dl
    :class="['pc-kv', `pc-kv--${layout}`, { 'pc-kv--compact': compact, 'pc-kv--boxed': boxed, 'pc-kv--no-dividers': !dividers }]"
    :style="{ '--pc-kv-label-w': labelWidth }"
  >
    <div v-for="(item, i) in items" :key="i" class="pc-kv__row">
      <dt class="pc-kv__label">
        <slot name="label" :item="item">{{ item.label }}</slot>
      </dt>
      <dd class="pc-kv__value">
        <slot name="value" :item="item">{{ item.value }}</slot>
      </dd>
    </div>
    <slot />
  </dl>
</template>

<style scoped>
.pc-kv {
  margin: 0;
  font-family: var(--display);
}

/* row - aligned label column + value column */
.pc-kv--row .pc-kv__row {
  display: grid;
  grid-template-columns: var(--pc-kv-label-w) 1fr;
  column-gap: 16px;
  align-items: baseline;
  padding: 5px 0;
}
.pc-kv--row.pc-kv--compact .pc-kv__row { padding: 3px 0; }

/* stack - label above value */
.pc-kv--stack .pc-kv__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 0;
}
.pc-kv--stack.pc-kv--compact .pc-kv__row { padding: 4px 0; }
.pc-kv--stack .pc-kv__label { margin-bottom: 2px; }

/* divided - label left, value right, dashed separators between rows */
.pc-kv--divided .pc-kv__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--ink-20);
}
.pc-kv--divided.pc-kv--compact .pc-kv__row { padding: 6px 0; }
.pc-kv--divided .pc-kv__row:last-child { border-bottom: 0; }
.pc-kv--divided.pc-kv--no-dividers .pc-kv__row { border-bottom: 0; }
.pc-kv--divided .pc-kv__value { text-align: right; }

/* boxed - tinted container */
.pc-kv--boxed {
  background: var(--ink-04);
  border-radius: var(--radius-comfy);
  padding: 4px 14px;
}

.pc-kv__label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
  line-height: 1.4;
  margin: 0;
  white-space: nowrap;
}
.pc-kv__value {
  margin: 0;
  font-size: 14px;
  letter-spacing: -0.14px;
  color: var(--ink);
  line-height: 1.4;
  min-width: 0;
}
</style>
