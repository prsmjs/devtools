<script setup>
import { computed, ref, watch } from 'vue'
import { useSSE } from '../sse.js'
import { PageHeader, ToggleGroup, Panel, Badge, EmptyState } from 'pastel-vue'

const props = defineProps({ config: Object })
const events = useSSE()
const enabled = ref([])

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString()
}

function source(type) {
  return type.split(':')[0]
}

function action(type) {
  const parts = type.split(':')
  return parts[0] === 'workflow' ? parts.slice(1).join(':') : parts[1]
}

const ACTIVE = new Set(['complete', 'fire', 'execution:succeeded', 'step:succeeded', 'change'])
const FAILED = new Set(['failed', 'error', 'execution:failed', 'step:failed', 'execution:lease-lost'])
const WARN = new Set(['retry', 'step:retry'])
const INFO = new Set(['step:routed'])

function actionVariant(type) {
  const a = action(type)
  if (ACTIVE.has(a)) return 'active'
  if (FAILED.has(a)) return 'failed'
  if (WARN.has(a)) return 'warning'
  if (INFO.has(a)) return 'paused'
  return 'default'
}

watch(
  () => props.config,
  (config) => {
    if (!config) return
    const keys = []
    if (config.queue?.length) keys.push('queue')
    if (config.cron) keys.push('cron')
    if (config.limit?.length) keys.push('limit')
    if (config.workflow) keys.push('workflow')
    if (config.cells?.length) keys.push('cells')
    if (config.cache?.length) keys.push('cache')
    enabled.value = keys
  },
  { immediate: true, deep: true }
)

const subsystemOptions = computed(() => [
  { value: 'queue', label: 'Queue', disabled: !props.config?.queue?.length },
  { value: 'cron', label: 'Cron', disabled: !props.config?.cron },
  { value: 'limit', label: 'Limit', disabled: !props.config?.limit?.length },
  { value: 'workflow', label: 'Workflow', disabled: !props.config?.workflow },
  { value: 'cells', label: 'Cells', disabled: !props.config?.cells?.length },
  { value: 'cache', label: 'Cache', disabled: !props.config?.cache?.length },
])

const today = computed(() =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
)

const filteredEvents = computed(() =>
  events.value.filter((evt) => enabled.value.includes(source(evt.type)))
)
</script>

<template>
  <div>
    <PageHeader
      :eyebrow="today"
      title="Runtime overview"
      subtitle="Live event stream across all registered subsystems."
    />

    <div class="page-body">
      <section class="page-section">
        <div class="filter-row">
          <span class="filter-row__label">Subsystems</span>
          <ToggleGroup
            multiple
            :model-value="enabled"
            :options="subsystemOptions"
            @update:model-value="enabled = $event || []"
          />
        </div>
      </section>

      <section class="page-section">
        <Panel title="Event stream" description="Newest events first, streamed live over SSE.">
          <div v-if="filteredEvents.length" class="stream">
            <div v-for="(evt, i) in filteredEvents.slice(0, 100)" :key="i" class="event">
              <span class="event__source">{{ source(evt.type) }}</span>
              <Badge :variant="actionVariant(evt.type)" size="sm">{{ action(evt.type) }}</Badge>
              <span class="event__data">{{ JSON.stringify(evt.data) }}</span>
              <span class="event__time">{{ formatTime(evt.ts) }}</span>
            </div>
          </div>
          <EmptyState
            v-else
            title="Waiting for events"
            description="Activity from connected subsystems will appear here as it happens."
          />
        </Panel>
      </section>
    </div>
  </div>
</template>

<style scoped>
.filter-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.filter-row__label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-60);
}

.stream {
  max-height: 560px;
  overflow-y: auto;
}
.event {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 24px;
  border-top: 1px solid var(--ink-08);
  font-size: 13px;
}
.event:first-child { border-top: 0; }
.event__source {
  width: 76px;
  flex-shrink: 0;
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--ink-40);
}
.event__data {
  flex: 1;
  min-width: 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink-60);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event__time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--ink-40);
}
</style>
