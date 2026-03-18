<template>
  <div v-if="!recordEntries.length" class="empty">no record subscriptions</div>
  <template v-else>
    <div class="view-hint">records being watched by at least one connection, and their subscription mode</div>
    <div v-for="[recordId, info] in recordEntries" :key="recordId" class="card">
      <div class="card-header">
        <span class="name">{{ recordId }}</span>
        <div>
          <span
            class="tag accent"
            style="cursor: pointer; margin-right: 4px;"
            @click="toggle(recordId)"
          >{{ recordId in watchedRecords ? 'hide' : 'view' }}</span>
          <span class="badge accent">{{ Object.keys(info.subscribers).length }} {{ Object.keys(info.subscribers).length === 1 ? 'subscriber' : 'subscribers' }}</span>
        </div>
      </div>
      <div v-if="recordId in watchedRecords" class="card-body" style="border-bottom: 1px solid var(--border-subtle);">
        <JsonView :data="watchedRecords[recordId]" />
      </div>
      <div class="card-body">
        <div v-for="(mode, connId) in info.subscribers" :key="connId" class="kv-row">
          <span class="kv-key conn-link" :title="connId" @click="$emit('navigate', connId)">{{ connId.slice(0, 8) }}</span>
          <span class="tag" :class="mode === 'full' ? 'accent' : ''">{{ mode }}</span>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import JsonView from '../../components/JsonView.vue'

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
