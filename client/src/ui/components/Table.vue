<script setup>
const props = defineProps({
  /**
   * columns: [{
   *   key,                  field on the row
   *   label,                header text
   *   align?    'left' | 'right' | 'center'
   *   width?    css width
   *   primary?  render larger + medium weight (the title column)
   *   mono?     render in uppercase monospace, dimmed (ids, versions, codes)
   *   subtitle? key of a second field, rendered as a dimmed mono line below
   * }]
   */
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: [String, Function], default: "id" },
  empty: { type: String, default: "No results" },
  // density
  compact: { type: Boolean, default: false },
  // rows respond to clicks (pointer cursor + emits row-click)
  clickable: { type: Boolean, default: false },
})
const emit = defineEmits(["row-click"])

const getKey = (row, i) => {
  if (typeof props.rowKey === "function") return props.rowKey(row, i)
  return row?.[props.rowKey] ?? i
}
</script>

<template>
  <div class="pc-table-wrap pc-scroll">
    <table :class="['pc-table', { 'pc-table--compact': compact, 'pc-table--clickable': clickable }]">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ width: col.width, textAlign: col.align || 'left' }"
          >{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="pc-table__empty">
            <slot name="empty">{{ empty }}</slot>
          </td>
        </tr>
        <tr
          v-for="(row, i) in rows"
          :key="getKey(row, i)"
          :class="{ 'pc-table__row--clickable': clickable }"
          @click="clickable && emit('row-click', row, i)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="[
              'pc-table__td',
              { 'pc-table__td--primary': col.primary, 'pc-table__td--mono': col.mono }
            ]"
            :style="{ textAlign: col.align || 'left' }"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              <div v-if="col.subtitle" class="pc-table__stack">
                <span class="pc-table__stack-title">{{ row[col.key] }}</span>
                <span class="pc-table__stack-sub">{{ row[col.subtitle] }}</span>
              </div>
              <template v-else>{{ row[col.key] }}</template>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.pc-table-wrap { width: 100%; overflow-x: auto; }
.pc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  letter-spacing: -0.14px;
  font-family: var(--display);
}

/* header */
.pc-table th {
  text-align: left;
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
  color: var(--ink-60);
  padding: 12px 18px;
  border-bottom: 1px solid var(--ink-08);
  white-space: nowrap;
}

/* cells - breathable by default */
.pc-table td {
  padding: 16px 18px;
  border-bottom: 1px solid var(--ink-08);
  color: var(--ink);
  vertical-align: middle;
}
.pc-table tbody tr { transition: background 120ms ease; }
.pc-table tbody tr:hover td { background: var(--ink-04); }
.pc-table tbody tr:last-child td { border-bottom: 0; }

/* clickable rows */
.pc-table--clickable .pc-table__row--clickable { cursor: pointer; }

/* column treatments */
.pc-table__td--primary {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  color: var(--ink);
}
.pc-table__td--mono {
  font-family: var(--mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-60);
}

/* two-line title + subtitle cell */
.pc-table__stack { display: flex; flex-direction: column; gap: 3px; }
.pc-table__stack-title {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  color: var(--ink);
}
.pc-table__stack-sub {
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-40);
}

/* empty */
.pc-table__empty {
  text-align: center !important;
  color: var(--ink-40);
  padding: 36px 18px !important;
  font-size: 13px;
}

/* compact density */
.pc-table--compact th { padding: 8px 12px; }
.pc-table--compact td { padding: 9px 12px; }
.pc-table--compact .pc-table__stack-title { font-size: 14px; }
.pc-table--compact .pc-table__td--primary { font-size: 14px; }
</style>
