<template>
  <div>
    <PageHeader
      eyebrow="WebSocket"
      title="Realtime"
      subtitle="Live inspector for rooms, channels, collections, records, and connection metadata."
    >
      <template #actions>
        <div class="rt-status">
          <span class="rt-pulse" :class="{ 'rt-pulse--down': !!error }" />
          <span v-if="state" class="rt-instance">instance {{ state.instanceId?.slice(0, 8) }}</span>
        </div>
      </template>
    </PageHeader>

    <div class="page-body">
      <Tabs
        :model-value="currentTab"
        :tabs="tabs"
        variant="underline"
        @update:model-value="goTab"
      />

      <div class="rt-layout">
        <aside class="rt-sidebar">
          <Panel title="Connections">
            <PanelSection flush>
              <div class="rt-sidebar__body">
                <ConnectionPicker
                  :connections="state?.connections || []"
                  :selected-id="selectedConnectionId"
                  @select="selectConnection"
                />
              </div>
            </PanelSection>
          </Panel>

          <Panel v-if="Object.keys(nonEmptyExposed).length" title="Registered">
            <PanelSection flush>
              <div class="rt-sidebar__body rt-exposed">
                <div v-for="(patterns, type) in nonEmptyExposed" :key="type" class="rt-exposed__row">
                  <span class="rt-exposed__label">{{ formatExposedLabel(type) }}</span>
                  <div class="rt-exposed__tags">
                    <Badge v-for="p in patterns" :key="p" size="sm">{{ p }}</Badge>
                  </div>
                </div>
              </div>
            </PanelSection>
          </Panel>
        </aside>

        <div class="rt-content">
          <router-view
            :rooms="filteredRooms"
            :channels="filteredChannels"
            :collections="filteredCollections"
            :records="filteredRecords"
            :detail="connectionDetail"
            :connections="state?.connections || []"
            :fetch-records="fetchCollectionRecords"
            :watched-records="watchedRecords"
            :watch-record="watchRecord"
            :unwatch-record="unwatchRecord"
            @navigate="navigateToConnection"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRealtimeApi } from '../composables/useRealtimeApi.js'
import ConnectionPicker from '../components/ConnectionPicker.vue'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import Tabs from '../ui/components/Tabs.vue'
import Badge from '../ui/components/Badge.vue'

const route = useRoute()
const router = useRouter()

const exposedLabels = {
  channels: 'channels',
  records: 'records',
  writableRecords: 'writable',
  collections: 'collections',
  presence: 'presence',
  commands: 'commands',
}

function formatExposedLabel(key) {
  return exposedLabels[key] || key
}

function navigateToConnection(connId) {
  selectConnection(connId)
  router.push('/realtime/metadata')
}

function goTab(id) {
  router.push(`/realtime/${id}`)
}

const {
  state,
  connectionDetail,
  selectedConnectionId,
  error,
  selectConnection,
  watchedRecords,
  watchRecord,
  unwatchRecord,
  fetchCollectionRecords,
} = useRealtimeApi()

const filteredRooms = computed(() => {
  if (!state.value?.rooms) return []
  if (!selectedConnectionId.value) return state.value.rooms
  return state.value.rooms.filter((r) => r.members.includes(selectedConnectionId.value))
})

const filteredChannels = computed(() => {
  if (!state.value?.channels) return {}
  if (!selectedConnectionId.value) return state.value.channels
  const out = {}
  for (const [ch, subs] of Object.entries(state.value.channels)) {
    if (subs.includes(selectedConnectionId.value)) out[ch] = subs
  }
  return out
})

const filteredCollections = computed(() => {
  if (!state.value?.collections) return {}
  if (!selectedConnectionId.value) return state.value.collections
  const out = {}
  for (const [id, info] of Object.entries(state.value.collections)) {
    if (info.subscribers[selectedConnectionId.value]) out[id] = info
  }
  return out
})

const filteredRecords = computed(() => {
  if (!state.value?.records) return {}
  if (!selectedConnectionId.value) return state.value.records
  const out = {}
  for (const [id, info] of Object.entries(state.value.records)) {
    if (info.subscribers[selectedConnectionId.value]) out[id] = info
  }
  return out
})

const nonEmptyExposed = computed(() => {
  if (!state.value?.exposed) return {}
  const out = {}
  for (const [k, v] of Object.entries(state.value.exposed)) {
    if (v.length) out[k] = v
  }
  return out
})

const tabs = computed(() => [
  { value: 'rooms', label: 'Rooms', badge: filteredRooms.value.length },
  { value: 'channels', label: 'Channels', badge: Object.keys(filteredChannels.value).length },
  { value: 'collections', label: 'Collections', badge: Object.keys(filteredCollections.value).length },
  { value: 'records', label: 'Records', badge: Object.keys(filteredRecords.value).length },
  { value: 'metadata', label: 'Metadata' },
])

const currentTab = computed(() => {
  const seg = route.path.split('/')[2]
  return seg || 'rooms'
})
</script>

<style scoped>
.rt-status {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rt-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-active);
}
.rt-pulse--down { background: var(--status-failed); }
.rt-instance {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--ink-60);
}

.rt-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
@media (max-width: 940px) {
  .rt-layout { grid-template-columns: 1fr; }
}

.rt-sidebar { display: flex; flex-direction: column; gap: 20px; }
.rt-sidebar__body { padding: 10px 12px; }

.rt-exposed { display: flex; flex-direction: column; gap: 14px; }
.rt-exposed__row { display: flex; flex-direction: column; gap: 6px; }
.rt-exposed__label {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--ink-40);
}
.rt-exposed__tags { display: flex; flex-wrap: wrap; gap: 4px; }

.rt-content { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
</style>
