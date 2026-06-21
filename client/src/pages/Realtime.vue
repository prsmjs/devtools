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

        </aside>

        <div class="rt-content">
          <router-view
            :rooms="filteredRooms"
            :channels="filteredChannels"
            :channel-messages="channelMessages"
            :selected-connection-id="selectedConnectionId"
            @select-connection="selectConnection"
            :collections="filteredCollections"
            :records="filteredRecords"
            :detail="connectionDetail"
            :connections="state?.connections || []"
            :exposed="state?.exposed || {}"
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
import { PageHeader, Panel, PanelSection, Tabs } from 'pastel-vue'

const route = useRoute()
const router = useRouter()

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
  channelMessages,
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
  for (const [ch, info] of Object.entries(state.value.channels)) {
    if (info.subscribers?.includes(selectedConnectionId.value)) out[ch] = info
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

const exposedCount = computed(() => {
  const e = state.value?.exposed
  if (!e) return 0
  return Object.values(e).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
})

const tabs = computed(() => [
  { value: 'rooms', label: 'Rooms', badge: filteredRooms.value.length },
  { value: 'channels', label: 'Channels', badge: Object.keys(filteredChannels.value).length },
  { value: 'collections', label: 'Collections', badge: Object.keys(filteredCollections.value).length },
  { value: 'records', label: 'Records', badge: Object.keys(filteredRecords.value).length },
  { value: 'metadata', label: 'Metadata' },
  { value: 'exposed', label: 'Exposed', badge: exposedCount.value },
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

.rt-content { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
</style>
