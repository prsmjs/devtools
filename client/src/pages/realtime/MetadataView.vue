<template>
  <div v-if="detail" class="meta-stack">
    <Panel title="Connection">
      <PanelSection>
        <KeyValue layout="divided" boxed :items="connectionItems" />
      </PanelSection>
    </Panel>

    <Panel title="Metadata">
      <PanelSection><JsonView :data="detail.metadata" /></PanelSection>
    </Panel>

    <Panel v-if="detail.rooms?.length" :title="`Rooms · ${detail.rooms.length}`">
      <PanelSection>
        <div class="tag-list">
          <Badge v-for="room in detail.rooms" :key="room" size="sm">{{ room }}</Badge>
        </div>
      </PanelSection>
    </Panel>

    <Panel v-if="detail.channels?.length" :title="`Channels · ${detail.channels.length}`">
      <PanelSection>
        <div class="tag-list">
          <Badge v-for="ch in detail.channels" :key="ch" size="sm">{{ ch }}</Badge>
        </div>
      </PanelSection>
    </Panel>

    <Panel v-if="detail.collections?.length" :title="`Collections · ${detail.collections.length}`">
      <PanelSection>
        <div class="tag-list">
          <Badge v-for="col in detail.collections" :key="col.id" size="sm">{{ col.id }} v{{ col.version }}</Badge>
        </div>
      </PanelSection>
    </Panel>

    <Panel v-if="detail.records?.length" :title="`Record subscriptions · ${detail.records.length}`">
      <PanelSection flush>
        <div v-for="rec in detail.records" :key="rec.id" class="meta-row">
          <span class="meta-row__id">{{ rec.id }}</span>
          <Badge :variant="rec.mode === 'full' ? 'paused' : 'default'" size="sm">{{ rec.mode }}</Badge>
        </div>
      </PanelSection>
    </Panel>

    <Panel v-if="detail.presence && Object.keys(detail.presence).length" title="Presence state">
      <PanelSection v-for="(pstate, room) in detail.presence" :key="room" :label="room">
        <JsonView :data="pstate" />
      </PanelSection>
    </Panel>
  </div>

  <div v-else-if="connections.length" class="meta-stack">
    <p class="rt-hint">All connections on this server instance.</p>
    <Panel v-for="conn in connections" :key="conn.id">
      <template #header>
        <h3 class="rt-card-title">{{ conn.metadata?.name || conn.metadata?.username || conn.id.slice(0, 8) }}</h3>
      </template>
      <template #aside>
        <div class="meta-conn-aside">
          <span v-if="conn.latency !== null" class="meta-latency">{{ conn.latency }}ms</span>
          <Badge :variant="conn.alive ? 'active' : 'failed'" dot>{{ conn.alive ? 'alive' : 'dead' }}</Badge>
        </div>
      </template>
      <PanelSection v-if="conn.metadata">
        <JsonView :data="conn.metadata" />
      </PanelSection>
    </Panel>
  </div>

  <EmptyState v-else title="No connections" description="Connected clients will appear here." />
</template>

<script setup>
import { computed } from 'vue'
import JsonView from '../../components/JsonView.vue'
import Panel from '../../ui/components/Panel.vue'
import PanelSection from '../../ui/components/PanelSection.vue'
import KeyValue from '../../ui/components/KeyValue.vue'
import Badge from '../../ui/components/Badge.vue'
import EmptyState from '../../ui/components/EmptyState.vue'

const props = defineProps({
  detail: { type: Object, default: null },
  connections: { type: Array, default: () => [] },
})

const connectionItems = computed(() => {
  const d = props.detail
  if (!d) return []
  const items = [
    { label: 'ID', value: d.id },
    { label: 'Local', value: String(d.local) },
    { label: 'Latency', value: d.latency !== null ? `${d.latency}ms` : '—' },
    { label: 'Alive', value: String(d.alive) },
  ]
  if (d.remoteAddress) items.push({ label: 'Address', value: d.remoteAddress })
  return items
})
</script>

<style scoped>
.meta-stack { display: flex; flex-direction: column; gap: 16px; }
.rt-hint {
  margin: 0;
  font-size: 13px;
  color: var(--ink-60);
}
.rt-card-title {
  margin: 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
}
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 24px;
  border-top: 1px solid var(--ink-08);
}
.meta-row:first-child { border-top: 0; }
.meta-row__id {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink);
}
.meta-conn-aside { display: flex; align-items: center; gap: 10px; }
.meta-latency {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
}
</style>
