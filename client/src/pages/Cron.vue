<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import { useSSE } from '../sse.js'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import Table from '../ui/components/Table.vue'
import Badge from '../ui/components/Badge.vue'
import EmptyState from '../ui/components/EmptyState.vue'

const jobs = ref([])
const events = useSSE()
const now = ref(Date.now())

let pollTimer = null
let tickTimer = null

async function poll() {
  const res = await fetch(api('/cron'))
  if (res.ok) {
    const data = await res.json()
    jobs.value = data.jobs
  }
}

onMounted(() => {
  poll()
  pollTimer = setInterval(poll, 2000)
  tickTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (tickTimer) clearInterval(tickTimer)
})

const cronEvents = computed(() =>
  events.value.filter((e) => e.type.startsWith('cron:')).slice(0, 100),
)

const jobRows = computed(() =>
  jobs.value.map((job) => ({
    name: job.name,
    next: job.nextFireTime ? new Date(job.nextFireTime).toLocaleTimeString() : '—',
    nextFireTime: job.nextFireTime,
  }))
)

const columns = [
  { key: 'name', label: 'Job', primary: true },
  { key: 'next', label: 'Next fire', align: 'right', mono: true },
  { key: 'in', label: 'In', align: 'right' },
]

function timeUntil(date) {
  if (!date) return '—'
  const ms = new Date(date).getTime() - now.value
  if (ms < 0) return 'now'
  if (ms < 1000) return '<1s'
  return `${Math.ceil(ms / 1000)}s`
}

function isSoon(date) {
  const t = timeUntil(date)
  return t === 'now' || t === '<1s'
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Scheduler"
      title="Cron"
      subtitle="Registered scheduled jobs with live countdowns to their next fire, and a log of fires and errors."
    />

    <div class="page-body">
      <section class="page-section">
        <Panel title="Registered jobs">
          <Table v-if="jobRows.length" :columns="columns" :rows="jobRows" row-key="name">
            <template #cell-in="{ row }">
              <span class="countdown" :class="{ 'countdown--soon': isSoon(row.nextFireTime) }">
                {{ timeUntil(row.nextFireTime) }}
              </span>
            </template>
          </Table>
          <EmptyState v-else title="No cron jobs registered" description="Scheduled jobs will appear here once registered." />
        </Panel>
      </section>

      <section class="page-section">
        <Panel title="Events" description="Fires and errors, newest first.">
          <div v-if="cronEvents.length" class="stream">
            <div v-for="(evt, i) in cronEvents" :key="i" class="event">
              <Badge :variant="evt.type.split(':')[1] === 'error' ? 'failed' : 'active'" size="sm">
                {{ evt.type.split(':')[1] }}
              </Badge>
              <span class="event__name">{{ evt.data.name }}</span>
              <span class="event__time">{{ new Date(evt.ts).toLocaleTimeString() }}</span>
            </div>
          </div>
          <EmptyState v-else title="No cron events yet" description="Job fires will appear here as they happen." />
        </Panel>
      </section>
    </div>
  </div>
</template>

<style scoped>
.countdown {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink-60);
  font-variant-numeric: tabular-nums;
}
.countdown--soon { color: var(--status-paused); font-weight: 500; }

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
.event__name {
  flex: 1;
  min-width: 0;
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
