<template>
  <EmptyState
    v-if="!recordEntries.length"
    title="No record subscriptions"
    description="Records being watched by at least one connection will appear here."
  />
  <template v-else>
    <p class="rt-hint">Records being watched by at least one connection, and each subscriber's mode.</p>
    <Panel v-for="[recordId, info] in recordEntries" :key="recordId">
      <template #header>
        <h3 class="rt-card-title">{{ recordId }}</h3>
      </template>
      <template #aside>
        <div class="rec-aside">
          <Button variant="ghost" size="sm" @click="toggle(recordId)">
            {{ recordId in watchedRecords ? 'Hide value' : 'View value' }}
          </Button>
          <Badge variant="active">
            {{ Object.keys(info.subscribers).length }}
            {{ Object.keys(info.subscribers).length === 1 ? 'subscriber' : 'subscribers' }}
          </Badge>
        </div>
      </template>
      <PanelSection v-if="recordId in watchedRecords" label="Current value">
        <JsonView :data="watchedRecords[recordId]" />
      </PanelSection>
      <PanelSection flush>
        <div v-for="(mode, connId) in info.subscribers" :key="connId" class="rt-row">
          <button type="button" class="rt-conn" :title="connId" @click="$emit('navigate', connId)">
            {{ connId.slice(0, 8) }}
          </button>
          <Badge :variant="mode === 'full' ? 'paused' : 'default'" size="sm">{{ mode }}</Badge>
        </div>
      </PanelSection>
    </Panel>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import JsonView from '../../components/JsonView.vue'
import Panel from '../../ui/components/Panel.vue'
import PanelSection from '../../ui/components/PanelSection.vue'
import Badge from '../../ui/components/Badge.vue'
import Button from '../../ui/components/Button.vue'
import EmptyState from '../../ui/components/EmptyState.vue'

const props = defineProps({
  records: { type: Object, default: () => ({}) },
  watchedRecords: { type: Object, required: true },
  watchRecord: { type: Function, required: true },
  unwatchRecord: { type: Function, required: true },
})

defineEmits(['navigate'])

const recordEntries = computed(() => Object.entries(props.records))

function toggle(recordId) {
  if (recordId in props.watchedRecords) {
    props.unwatchRecord(recordId)
  } else {
    props.watchRecord(recordId)
  }
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
.rec-aside { display: flex; align-items: center; gap: 10px; }
.rt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
