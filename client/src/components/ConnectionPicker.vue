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
      <span class="conn-item__stack">
        <span v-if="conn.label" class="conn-item__label">{{ conn.label }}</span>
        <span class="conn-item__id" :class="{ 'conn-item__id--solo': !conn.label }" :title="conn.id">{{ conn.id.slice(0, 8) }}</span>
      </span>
      <span v-if="conn.latency !== null" class="conn-item__meta" title="Last measured round-trip time">
        <span class="conn-item__meta-label">rtt</span>
        <span class="conn-item__meta-value">{{ conn.latency }}ms</span>
      </span>
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
  transition: background 120ms ease;
}
.conn-item:hover:not(.conn-item--active) { background: var(--ink-04); }
.conn-item--active { background: var(--ink-08); }
.conn-item__label {
  font-size: 13px;
  letter-spacing: -0.13px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conn-item__stack { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.conn-item__id {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
  letter-spacing: 0.02em;
}
.conn-item__id--solo { font-size: 12px; color: var(--ink); }
.conn-item__count {
  flex-shrink: 0;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--ink-40);
}
.conn-item__meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  line-height: 1;
}
.conn-item__meta-label {
  font-family: var(--mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-40);
}
.conn-item__meta-value {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-60);
}
</style>
