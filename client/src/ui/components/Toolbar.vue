<script setup>
import { computed, useSlots } from "vue"

const props = defineProps({
  size: { type: String, default: "md" }, // sm | md
  bordered: { type: Boolean, default: false },
  sticky: { type: Boolean, default: false },
  // when false, the filters row never wraps (overflows horizontally)
  wrapFilters: { type: Boolean, default: true },
  // optional divider between primary and filters rows
  divider: { type: Boolean, default: false },
})

const slots = useSlots()
const hasFiltersRow = computed(() =>
  !!(slots.filters || slots["filters-leading"] || slots["filters-trailing"])
)
</script>

<template>
  <div :class="[
    'pc-toolbar',
    `pc-toolbar--${size}`,
    { 'pc-toolbar--bordered': bordered, 'pc-toolbar--sticky': sticky, 'pc-toolbar--two-row': hasFiltersRow }
  ]" role="toolbar">
    <div class="pc-toolbar__row">
      <div v-if="$slots.leading" class="pc-toolbar__group pc-toolbar__leading"><slot name="leading" /></div>
      <div class="pc-toolbar__main"><slot /></div>
      <div v-if="$slots.trailing" class="pc-toolbar__group pc-toolbar__trailing"><slot name="trailing" /></div>
    </div>

    <hr v-if="hasFiltersRow && divider" class="pc-toolbar__divider" />

    <div v-if="hasFiltersRow" class="pc-toolbar__row pc-toolbar__row--filters" :class="{ 'pc-toolbar__row--nowrap': !wrapFilters }">
      <div v-if="$slots['filters-leading']" class="pc-toolbar__group pc-toolbar__leading"><slot name="filters-leading" /></div>
      <div class="pc-toolbar__main pc-toolbar__main--filters"><slot name="filters" /></div>
      <div v-if="$slots['filters-trailing']" class="pc-toolbar__group pc-toolbar__trailing"><slot name="filters-trailing" /></div>
    </div>
  </div>
</template>

<style scoped>
.pc-toolbar {
  display: flex;
  flex-direction: column;
  background: var(--paper);
}
.pc-toolbar--sticky { position: sticky; top: 0; z-index: 5; }
.pc-toolbar--bordered { border-bottom: 1px solid var(--ink-08); }

.pc-toolbar__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  min-height: 56px;
  min-width: 0;
}
.pc-toolbar--sm .pc-toolbar__row { padding: 6px 12px; min-height: 44px; gap: 8px; }
/* tighten the gap between two stacked rows */
.pc-toolbar--two-row .pc-toolbar__row { min-height: 50px; padding-top: 8px; padding-bottom: 8px; }
.pc-toolbar--two-row .pc-toolbar__row + .pc-toolbar__row { padding-top: 0; }
.pc-toolbar--two-row.pc-toolbar--sm .pc-toolbar__row + .pc-toolbar__row { padding-top: 0; }

.pc-toolbar__row--filters {
  /* secondary row: filter chips, multiselects, date ranges */
  padding-bottom: 12px;
}
.pc-toolbar--sm .pc-toolbar__row--filters { padding-bottom: 8px; }

.pc-toolbar__main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  flex-wrap: nowrap;
}
/* filters row CAN wrap (chips and selects often multiply) */
.pc-toolbar__main--filters { flex-wrap: wrap; row-gap: 8px; }
.pc-toolbar__row--nowrap .pc-toolbar__main { flex-wrap: nowrap; overflow-x: auto; }

.pc-toolbar__group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.pc-toolbar__leading { margin-right: 4px; }
.pc-toolbar__trailing { margin-left: auto; }

.pc-toolbar__divider {
  border: 0;
  height: 1px;
  background: var(--ink-08);
  margin: 0 16px;
}
.pc-toolbar--sm .pc-toolbar__divider { margin: 0 12px; }
</style>
