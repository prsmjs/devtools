<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import { useSSE } from '../sse.js'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import Card from '../ui/components/Card.vue'
import Stat from '../ui/components/Stat.vue'
import Badge from '../ui/components/Badge.vue'
import Button from '../ui/components/Button.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import { toast } from '../ui/composables/toast.js'

const jobs = ref([])
const events = useSSE()
const now = ref(Date.now())
const running = ref(null)

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

async function runJob(name) {
  running.value = name
  try {
    const res = await fetch(api(`/cron/${encodeURIComponent(name)}/run`), { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error('Run failed', { description: data.error || 'The job could not be run.' })
    } else if (data.ran === false) {
      toast.warning('Job not run', {
        description: data.reason === 'already running'
          ? 'This exclusive job is already running.'
          : data.reason || 'The job did not run.',
      })
    } else {
      toast.success(`Triggered ${name}`, { description: 'See the events below for the result.' })
    }
  } catch (err) {
    toast.error('Run failed', { description: err.message })
  } finally {
    running.value = null
  }
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
        <div v-if="jobs.length" class="cron-grid">
          <Card
            v-for="job in jobs"
            :key="job.name"
            padded
            class="cron-card"
            :class="{ 'cron-card--soon': isSoon(job.nextFireTime) }"
          >
            <div class="cron-card__head">
              <span class="cron-card__name">{{ job.name }}</span>
              <Button
                size="sm"
                variant="ghost"
                icon="lucide:play"
                :loading="running === job.name"
                @click="runJob(job.name)"
              >Run</Button>
            </div>
            <Stat
              label="Next fire"
              :value="timeUntil(job.nextFireTime)"
              :caption="job.nextFireTime ? `at ${new Date(job.nextFireTime).toLocaleTimeString()}` : 'no schedule'"
              size="md"
            />
          </Card>
        </div>
        <Panel v-else>
          <EmptyState title="No cron jobs registered" description="Scheduled jobs will appear here once registered." />
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
.cron-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(264px, 1fr));
  gap: 16px;
}

.cron-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.cron-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.cron-card__name {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cron-card--soon :deep(.pc-stat__value) {
  color: var(--status-paused);
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
