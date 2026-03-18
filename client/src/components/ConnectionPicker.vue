<template>
  <div class="sidebar-section">
    <div class="sidebar-header">connections</div>
    <div
      class="sidebar-item"
      :class="{ active: !selectedId }"
      @click="$emit('select', null)"
    >
      <span class="label">all connections</span>
      <span class="badge" v-if="connections.length">{{ connections.length }}</span>
    </div>
    <div
      v-for="conn in connections"
      :key="conn.id"
      class="sidebar-item"
      :class="{ active: selectedId === conn.id }"
      @click="$emit('select', conn.id)"
    >
      <span class="label" :title="conn.id">{{ conn.id.slice(0, 8) }}</span>
      <span class="meta" v-if="conn.latency !== null">{{ conn.latency }}ms</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  connections: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
})

defineEmits(['select'])
</script>
