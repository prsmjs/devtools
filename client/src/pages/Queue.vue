<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import { useSSE } from '../sse.js'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import Card from '../ui/components/Card.vue'
import Stat from '../ui/components/Stat.vue'
import Badge from '../ui/components/Badge.vue'
import EmptyState from '../ui/components/EmptyState.vue'

const inFlight = ref(0)
const events = useSSE()

let pollTimer = null

async function poll() {
  const res = await fetch(api('/queue'))
  if (res.ok) {
    const data = await res.json()
    inFlight.value = data.inFlight
  }
}

onMounted(() => {
  poll()
  pollTimer = setInterval(poll, 1000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const queueEvents = computed(() =>
  events.value.filter((e) => e.type.startsWith('queue:')).slice(0, 100),
)

const trackCounts = computed(() => {
  let c = 0, f = 0, r = 0
  for (const e of events.value) {
    if (e.type === 'queue:complete') c++
    if (e.type === 'queue:failed') f++
    if (e.type === 'queue:retry') r++
  }
  return { completed: c, failed: f, retried: r }
})

const ACTION_VARIANT = {
  complete: 'active',
  failed: 'failed',
  retry: 'warning',
  new: 'default',
  drain: 'default',
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Job queue"
      title="Queue"
      subtitle="In-flight work right now, plus completed, failed, and retried counts for this session."
    />

    <div class="page-body">
      <section class="page-section">
        <div class="stats-grid">
          <Card padded elevated>
            <Stat label="In-flight" :value="inFlight" caption="jobs running right now" size="lg" />
          </Card>
          <Card padded elevated>
            <Stat label="Completed" :value="trackCounts.completed" caption="since page load" size="lg" />
          </Card>
          <Card padded elevated>
            <Stat label="Failed" :value="trackCounts.failed" caption="since page load" size="lg" />
          </Card>
          <Card padded elevated>
            <Stat label="Retried" :value="trackCounts.retried" caption="since page load" size="lg" />
          </Card>
        </div>
      </section>

      <section class="page-section">
        <Panel title="Events" description="Queue lifecycle events, newest first.">
          <div v-if="queueEvents.length" class="stream">
            <div v-for="(evt, i) in queueEvents" :key="i" class="event">
              <Badge :variant="ACTION_VARIANT[evt.type.split(':')[1]] || 'default'" size="sm">
                {{ evt.type.split(':')[1] }}
              </Badge>
              <span class="event__data">{{ JSON.stringify(evt.data) }}</span>
              <span class="event__time">{{ new Date(evt.ts).toLocaleTimeString() }}</span>
            </div>
          </div>
          <EmptyState v-else title="No queue events yet" description="Job activity will appear here as it happens." />
        </Panel>
      </section>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 880px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

.stream { max-height: 480px; overflow-y: auto; }
.event {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 24px;
  border-top: 1px solid var(--ink-08);
  font-size: 13px;
}
.event:first-child { border-top: 0; }
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
