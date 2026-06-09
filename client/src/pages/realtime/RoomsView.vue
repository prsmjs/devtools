<template>
  <EmptyState v-if="!rooms.length" title="No rooms" description="Active rooms and their members will appear here." />
  <template v-else>
    <p class="rt-hint">Active rooms, their members, and each member's presence state.</p>
    <Panel v-for="room in rooms" :key="room.name">
      <template #header>
        <h3 class="rt-card-title">{{ room.name }}</h3>
      </template>
      <template #aside>
        <Badge variant="active">{{ room.members.length }} {{ room.members.length === 1 ? 'member' : 'members' }}</Badge>
      </template>
      <PanelSection v-if="room.metadata" label="Room metadata">
        <JsonView :data="room.metadata" />
      </PanelSection>
      <PanelSection flush>
        <div v-for="memberId in room.members" :key="memberId" class="rt-row">
          <ConnectionChip
            :connection-id="memberId"
            :connections="connections"
            interactive
            show-sublabel
            @navigate="$emit('navigate', $event)"
          />
          <span v-if="room.presence[memberId]" class="rt-presence">{{ formatPresence(room.presence[memberId]) }}</span>
          <span v-else class="rt-presence rt-presence--none">no presence</span>
        </div>
      </PanelSection>
    </Panel>
  </template>
</template>

<script setup>
import Panel from '../../ui/components/Panel.vue'
import PanelSection from '../../ui/components/PanelSection.vue'
import Badge from '../../ui/components/Badge.vue'
import EmptyState from '../../ui/components/EmptyState.vue'
import ConnectionChip from '../../components/ConnectionChip.vue'
import JsonView from '../../components/JsonView.vue'

defineProps({
  rooms: { type: Array, default: () => [] },
  connections: { type: Array, default: () => [] },
})

defineEmits(['navigate'])

function formatPresence(state) {
  if (typeof state === 'string') return state
  if (typeof state === 'object' && state !== null) {
    const keys = Object.keys(state)
    if (keys.length <= 3) {
      return keys.map((k) => `${k}: ${JSON.stringify(state[k])}`).join(', ')
    }
    return `{${keys.length} fields}`
  }
  return String(state)
}
</script>

<style scoped>
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
.rt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 24px;
  border-top: 1px solid var(--ink-08);
}
.rt-row:first-child { border-top: 0; }
.rt-presence {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--status-active);
}
.rt-presence--none { color: var(--ink-40); }
</style>
