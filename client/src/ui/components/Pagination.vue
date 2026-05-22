<script setup>
import { computed } from "vue"
import Select from "./Select.vue"

const props = defineProps({
  page: { type: Number, required: true }, // 1-indexed
  pageSize: { type: Number, default: 25 },
  total: { type: Number, required: true },
  pageSizes: { type: Array, default: () => [10, 25, 50, 100] },
  showPageSize: { type: Boolean, default: true },
  showSummary: { type: Boolean, default: true },
})
const emit = defineEmits(["update:page", "update:pageSize"])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1)
const to = computed(() => Math.min(props.total, props.page * props.pageSize))

const go = (p) => {
  const next = Math.max(1, Math.min(totalPages.value, p))
  if (next !== props.page) emit("update:page", next)
}

const pages = computed(() => {
  const t = totalPages.value
  const p = props.page
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const range = []
  range.push(1)
  if (p > 4) range.push("…")
  for (let i = Math.max(2, p - 1); i <= Math.min(t - 1, p + 1); i++) range.push(i)
  if (p < t - 3) range.push("…")
  range.push(t)
  return range
})
</script>

<template>
  <div class="pc-pagination">
    <div v-if="showSummary" class="pc-pagination__summary">
      <span class="pc-tabular">{{ from }}-{{ to }}</span>
      <span class="pc-pagination__sep"> of </span>
      <span class="pc-tabular">{{ total }}</span>
    </div>

    <div v-if="showPageSize" class="pc-pagination__size">
      <span class="pc-pagination__size-label">Rows</span>
      <Select
        :modelValue="pageSize"
        :options="pageSizes"
        size="sm"
        @update:modelValue="v => emit('update:pageSize', Number(v))"
      />
    </div>

    <div class="pc-pagination__pages">
      <button
        type="button"
        class="pc-pagination__nav"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="go(page - 1)"
      >‹</button>
      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === '…'" class="pc-pagination__ellipsis">…</span>
        <button
          v-else
          type="button"
          :class="['pc-pagination__page', { 'pc-pagination__page--active': p === page }]"
          @click="go(p)"
        >{{ p }}</button>
      </template>
      <button
        type="button"
        class="pc-pagination__nav"
        :disabled="page >= totalPages"
        aria-label="Next page"
        @click="go(page + 1)"
      >›</button>
    </div>
  </div>
</template>

<style scoped>
.pc-pagination {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-family: var(--display);
  font-size: 13px;
  color: var(--ink);
  letter-spacing: -0.13px;
}
.pc-pagination__summary { color: var(--ink-60); font-variant-numeric: tabular-nums; }
.pc-pagination__sep { color: var(--ink-40); }
.pc-pagination__size { display: flex; align-items: center; gap: 6px; }
.pc-pagination__size-label { color: var(--ink-60); font-size: 12px; }
.pc-pagination__pages { display: flex; align-items: center; gap: 2px; margin-left: auto; }
.pc-pagination__page,
.pc-pagination__nav {
  min-width: var(--control-h-sm);
  height: var(--control-h-sm);
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sharp);
  font-family: var(--display);
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-60);
  background: transparent;
  border: 0;
  outline: none;
  transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
  font-variant-numeric: tabular-nums;
}
.pc-pagination__page:hover:not(:disabled):not(.pc-pagination__page--active),
.pc-pagination__nav:hover:not(:disabled) { background: var(--ink-04); color: var(--ink); }
.pc-pagination__page:focus-visible,
.pc-pagination__nav:focus-visible { box-shadow: var(--focus-ring); }
.pc-pagination__page--active {
  background: var(--midnight);
  color: var(--paper-on-dark);
}
.pc-pagination__nav { font-size: 16px; color: var(--ink-60); }
.pc-pagination__nav:disabled { opacity: 0.3; cursor: not-allowed; }
.pc-pagination__ellipsis { color: var(--ink-40); padding: 0 4px; }
</style>
