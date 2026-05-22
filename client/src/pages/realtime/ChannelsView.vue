<template>
  <EmptyState
    v-if="!channelEntries.length"
    title="No channel subscriptions"
    description="Channels with active subscribers will appear here."
  />
  <template v-else>
    <p class="rt-hint">Channels with active subscribers on this server instance.</p>
    <Panel v-for="[channel, subscribers] in channelEntries" :key="channel">
      <template #header>
        <h3 class="rt-card-title">{{ channel }}</h3>
      </template>
      <template #aside>
        <Badge variant="active">{{ subscribers.length }} {{ subscribers.length === 1 ? 'subscriber' : 'subscribers' }}</Badge>
      </template>
      <PanelSection flush>
        <div v-for="connId in subscribers" :key="connId" class="rt-row">
          <button type="button" class="rt-conn" :title="connId" @click="$emit('navigate', connId)">
            {{ connId.slice(0, 8) }}
          </button>
        </div>
      </PanelSection>
    </Panel>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import Panel from '../../ui/components/Panel.vue'
import PanelSection from '../../ui/components/PanelSection.vue'
import Badge from '../../ui/components/Badge.vue'
import EmptyState from '../../ui/components/EmptyState.vue'

const props = defineProps({
  channels: { type: Object, default: () => ({}) },
})

defineEmits(['navigate'])

const channelEntries = computed(() => Object.entries(props.channels))
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
  gap: 12px;
  padding: 10px 24px;
  border-top: 1px solid var(--ink-08);
}
.rt-row:first-child { border-top: 0; }
.rt-conn {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink);
  cursor: pointer;
  border-bottom: 1px solid var(--ink-20);
  padding-bottom: 1px;
  transition: border-color 120ms ease;
}
.rt-conn:hover { border-bottom-color: var(--ink); }
</style>
