<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import { useSSE } from '../sse.js'

const jobs = ref([])
const events = useSSE()

let pollTimer = null

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
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const cronEvents = computed(() =>
  events.value.filter((e) => e.type.startsWith('cron:')).slice(0, 100),
)

function timeUntil(date) {
  if (!date) return '-'
  const ms = new Date(date).getTime() - Date.now()
  if (ms < 0) return 'now'
  if (ms < 1000) return '<1s'
  return `${Math.ceil(ms / 1000)}s`
}
</script>

<template>
  <div>
    <div class="section-title">registered jobs</div>
    <div class="card" v-if="jobs.length" style="margin-bottom: 24px;">
      <div class="job-row header">
        <span class="col-name">name</span>
        <span class="col-next">next fire</span>
        <span class="col-in">in</span>
      </div>
      <div v-for="job in jobs" :key="job.name" class="job-row">
        <span class="col-name">{{ job.name }}</span>
        <span class="col-next">{{ job.nextFireTime ? new Date(job.nextFireTime).toLocaleTimeString() : '-' }}</span>
        <span class="col-in" :class="{ soon: timeUntil(job.nextFireTime) === '<1s' || timeUntil(job.nextFireTime) === 'now' }">{{ timeUntil(job.nextFireTime) }}</span>
      </div>
    </div>
    <p v-else class="empty" style="text-align: left; padding: 0; margin-bottom: 24px;">no cron jobs registered</p>

    <div class="section-title">events</div>
    <div class="stream" v-if="cronEvents.length">
      <div v-for="(evt, i) in cronEvents" :key="i" class="event-row">
        <span class="event-action" :class="evt.type.split(':')[1]">{{ evt.type.split(':')[1] }}</span>
        <span class="event-name">{{ evt.data.name }}</span>
        <span class="event-time">{{ new Date(evt.ts).toLocaleTimeString() }}</span>
      </div>
    </div>
    <p v-else class="empty" style="text-align: left; padding: 0;">no cron events yet</p>
  </div>
</template>

<style scoped>
.job-row { display: flex; align-items: center; padding: 0; border-bottom: 1px solid var(--border-subtle); font-size: 11px; }
.job-row:last-child { border-bottom: none; }
.job-row.header { font-size: 10px; color: var(--text-muted); letter-spacing: 0.3px; text-transform: uppercase; border-bottom: 1px solid var(--border); }
.job-row.header span { padding: 8px 12px; }

.col-name { flex: 1; padding: 10px 12px; }
.col-next { width: 100px; padding: 10px 12px; color: #666; text-align: right; }
.col-in { width: 60px; padding: 10px 12px; color: var(--text-muted); text-align: right; }
.col-in.soon { color: var(--color-blue); }

.stream { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; max-height: 400px; overflow-y: auto; }
.event-row { display: flex; align-items: center; border-bottom: 1px solid var(--bg-raised); font-size: 11px; }
.event-row:last-child { border-bottom: none; }

.event-action { width: 52px; padding: 6px 10px; color: var(--text-muted); flex-shrink: 0; }
.event-action.fire { color: var(--color-green); }
.event-action.error { color: var(--color-red); }

.event-name { flex: 1; padding: 6px 8px; color: #666; }
.event-time { width: 80px; padding: 6px 8px; color: #333; text-align: right; flex-shrink: 0; }
</style>
