<template>
  <EmptyState
    v-if="!collectionEntries.length"
    title="No collection subscriptions"
    description="Collections with active subscribers will appear here."
  />
  <template v-else>
    <p class="rt-hint">Collections with active subscribers - expand a connection to see what the resolver returns for it.</p>
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
        <div v-for="(sub, connId) in info.subscribers" :key="connId" class="coll-sub">
          <div class="rt-row">
            <button type="button" class="rt-conn" :title="connId" @click="$emit('navigate', connId)">
              {{ connId.slice(0, 8) }}
            </button>
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

const props = defineProps({
  collections: { type: Object, default: () => ({}) },
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
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
}
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
.coll-version {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
  margin-right: auto;
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
