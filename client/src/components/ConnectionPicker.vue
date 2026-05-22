<template>
  <div class="conn-picker">
    <button
      type="button"
      class="conn-item"
      :class="{ 'conn-item--active': !selectedId }"
      @click="$emit('select', null)"
    >
      <span class="conn-item__label">All connections</span>
      <span v-if="connections.length" class="conn-item__count">{{ connections.length }}</span>
    </button>
    <button
      v-for="conn in connections"
      :key="conn.id"
      type="button"
      class="conn-item"
      :class="{ 'conn-item--active': selectedId === conn.id }"
      @click="$emit('select', conn.id)"
    >
      <span class="conn-item__label conn-item__label--mono" :title="conn.id">{{ conn.id.slice(0, 8) }}</span>
      <span v-if="conn.latency !== null" class="conn-item__meta">{{ conn.latency }}ms</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  connections: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
})

defineEmits(['select'])
</script>

<style scoped>
.conn-picker { display: flex; flex-direction: column; gap: 2px; }
.conn-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  border-radius: var(--radius-sharp);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.conn-item:hover:not(.conn-item--active) { background: var(--ink-04); }
.conn-item--active { background: var(--midnight); }
.conn-item__label {
  font-size: 13px;
  letter-spacing: -0.13px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conn-item__label--mono { font-family: var(--mono); font-size: 12px; }
.conn-item--active .conn-item__label { color: var(--paper-on-dark); }
.conn-item__count,
.conn-item__meta {
  flex-shrink: 0;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--ink-40);
}
.conn-item--active .conn-item__count,
.conn-item--active .conn-item__meta { color: var(--paper-on-dark-60); }
</style>
