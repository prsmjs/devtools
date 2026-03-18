<script setup>
import { computed, ref, watch } from 'vue'
import { useSSE } from '../sse.js'

const props = defineProps({ config: Object })
const events = useSSE()
const enabledSources = ref({ queue: true, cron: true, limit: true, workflow: true })

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

function toggleSource(name) {
  enabledSources.value[name] = !enabledSources.value[name]
}

watch(
  () => props.config,
  (config) => {
    if (!config) return

    enabledSources.value = {
      queue: Boolean(config.queue),
      cron: Boolean(config.cron),
      limit: Boolean(config.limit?.length),
      workflow: Boolean(config.workflow),
    }
  },
  { immediate: true, deep: true }
)

const filteredEvents = computed(() =>
  events.value.filter((evt) => enabledSources.value[source(evt.type)] !== false)
)
</script>

<template>
  <div>
    <div class="section-title">subsystems</div>

    <div class="subsystems">
      <button
        class="chip"
        :class="{ on: config.queue && enabledSources.queue, off: config.queue && !enabledSources.queue }"
        :disabled="!config.queue"
        @click="toggleSource('queue')"
      >
        queue
      </button>
      <button
        class="chip"
        :class="{ on: config.cron && enabledSources.cron, off: config.cron && !enabledSources.cron }"
        :disabled="!config.cron"
        @click="toggleSource('cron')"
      >
        cron
      </button>
      <button
        class="chip"
        :class="{ on: config.limit?.length && enabledSources.limit, off: config.limit?.length && !enabledSources.limit }"
        :disabled="!config.limit?.length"
        @click="toggleSource('limit')"
      >
        limit{{ config.limit?.length ? ` (${config.limit.length})` : '' }}
      </button>
      <button
        class="chip"
        :class="{ on: config.workflow && enabledSources.workflow, off: config.workflow && !enabledSources.workflow }"
        :disabled="!config.workflow"
        @click="toggleSource('workflow')"
      >
        workflow
      </button>
    </div>

    <section>
      <div class="section-title">event stream</div>
      <div class="stream" v-if="filteredEvents.length">
        <div v-for="(evt, i) in filteredEvents.slice(0, 80)" :key="i" class="event-row">
          <span class="event-source">{{ source(evt.type) }}</span>
          <span class="event-action" :class="action(evt.type).replace(':', '-')">{{ action(evt.type) }}</span>
          <span class="event-data">{{ JSON.stringify(evt.data) }}</span>
          <span class="event-time">{{ formatTime(evt.ts) }}</span>
        </div>
      </div>
      <p v-else class="empty" style="text-align: left; padding: 0;">waiting for events</p>
    </section>
  </div>
</template>

<style scoped>
section { margin-top: 28px; }

.subsystems { display: flex; gap: 8px; margin-bottom: 20px; }
.chip { padding: 5px 14px; font-size: 11px; font-weight: 500; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; font-family: inherit; cursor: pointer; }
.chip.on { color: var(--text); border-color: #333; }
.chip.off { color: var(--text-muted); border-color: var(--border-subtle); opacity: 0.55; }
.chip:disabled { cursor: default; opacity: 0.35; }

.stream { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; max-height: 520px; overflow-y: auto; }
.event-row { display: flex; gap: 0; align-items: center; padding: 0; border-bottom: 1px solid var(--bg-raised); font-size: 11px; }
.event-row:last-child { border-bottom: none; }

.event-source { width: 72px; padding: 6px 8px; color: var(--text-muted); text-align: right; border-right: 1px solid var(--bg-raised); flex-shrink: 0; }
.event-action { width: 152px; padding: 6px 8px; color: var(--text-muted); flex-shrink: 0; }
.event-action.complete { color: var(--color-green); }
.event-action.fire { color: var(--color-green); }
.event-action.execution-succeeded { color: var(--color-green); }
.event-action.step-succeeded { color: var(--color-green); }
.event-action.step-routed { color: var(--color-blue); }
.event-action.failed { color: var(--color-red); }
.event-action.error { color: var(--color-red); }
.event-action.execution-failed { color: var(--color-red); }
.event-action.step-failed { color: var(--color-red); }
.event-action.execution-lease-lost { color: var(--color-red); }
.event-action.retry { color: var(--color-yellow); }
.event-action.step-retry { color: var(--color-yellow); }
.event-data { flex: 1; min-width: 0; padding: 6px 8px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-time { width: 80px; padding: 6px 8px; color: var(--text-muted); text-align: right; flex-shrink: 0; }
</style>
