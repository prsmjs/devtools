<template>
  <EmptyState
    v-if="!collectionEntries.length"
    title="No collection subscriptions"
    description="Collections with active subscribers will appear here."
  />
  <template v-else>
    <p class="rt-hint">A collection is a per-connection index of record IDs. Each row below is one subscriber - the resolver was called for that connection and returned the list shown when expanded.</p>
    <Panel v-for="[collId, info] in collectionEntries" :key="collId">
      <template #header>
        <h3 class="rt-card-title">{{ collId }}</h3>
      </template>
      <template #aside>
        <Badge variant="active">
          {{ Object.keys(info.subscribers).length }}
          {{ Object.keys(info.subscribers).length === 1 ? 'subscriber' : 'subscribers' }}
        </Badge>
      </template>
      <PanelSection flush>
        <div class="coll-thead">
          <span>Subscriber</span>
          <span>Version</span>
          <span></span>
        </div>
        <div v-for="(sub, connId) in info.subscribers" :key="connId" class="coll-sub">
          <div class="rt-row">
            <ConnectionChip
              :connection-id="connId"
              :connections="connections"
              interactive
              show-sublabel
              @navigate="$emit('navigate', $event)"
            />
            <span class="coll-version">v{{ sub.version }}</span>
            <Button variant="ghost" size="sm" @click="toggleRecords(collId, connId)">
              {{ loadedRecords[recordKey(collId, connId)] ? 'Hide records' : 'Show records' }}
            </Button>
          </div>
          <div v-if="loadedRecords[recordKey(collId, connId)]" class="coll-records">
            <div class="coll-records__label">
              Resolved records · {{ loadedRecords[recordKey(collId, connId)].recordIds.length }}
            </div>
            <div
              v-for="rec in loadedRecords[recordKey(collId, connId)].records"
              :key="rec.id"
              class="coll-record"
            >
              <div class="coll-record__id">{{ rec.id }}</div>
              <JsonView :data="rec.data" />
            </div>
            <p v-if="!loadedRecords[recordKey(collId, connId)].records.length" class="coll-empty">
              No records resolved.
            </p>
          </div>
        </div>
      </PanelSection>
    </Panel>
  </template>
</template>

<script setup>
import { computed, reactive } from 'vue'
import JsonView from '../../components/JsonView.vue'
import Panel from '../../ui/components/Panel.vue'
import PanelSection from '../../ui/components/PanelSection.vue'
import Badge from '../../ui/components/Badge.vue'
import Button from '../../ui/components/Button.vue'
import EmptyState from '../../ui/components/EmptyState.vue'
import ConnectionChip from '../../components/ConnectionChip.vue'

const props = defineProps({
  collections: { type: Object, default: () => ({}) },
  connections: { type: Array, default: () => [] },
  fetchRecords: { type: Function, required: true },
})

defineEmits(['navigate'])

const collectionEntries = computed(() => Object.entries(props.collections))
const loadedRecords = reactive({})

function recordKey(collId, connId) {
  return `${collId}::${connId}`
}

async function toggleRecords(collId, connId) {
  const key = recordKey(collId, connId)
  if (loadedRecords[key]) {
    delete loadedRecords[key]
    return
  }
  loadedRecords[key] = await props.fetchRecords(collId, connId)
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
.coll-sub { border-top: 1px solid var(--ink-08); }
.coll-sub:first-child { border-top: 0; }
.rt-row {
  display: grid;
  grid-template-columns: 1fr 80px 140px;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
}
.coll-thead {
  display: grid;
  grid-template-columns: 1fr 80px 140px;
  gap: 12px;
  padding: 8px 24px;
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--ink-40);
  background: var(--ink-04);
  border-bottom: 1px solid var(--ink-08);
}
.coll-version {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
}
.coll-records {
  padding: 14px 24px 18px;
  background: var(--ink-04);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.coll-records__label {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--ink-60);
}
.coll-record { display: flex; flex-direction: column; gap: 4px; }
.coll-record__id {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
}
.coll-empty { margin: 0; font-size: 12.5px; color: var(--ink-40); }
</style>
