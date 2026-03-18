<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import { useSSE } from '../sse.js'

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
</script>

<template>
  <div>
    <div class="section-title">queue</div>

    <div class="gauges">
      <div class="gauge">
        <span class="gauge-value" :class="{ lit: inFlight > 0 }">{{ inFlight }}</span>
        <span class="gauge-label">in-flight</span>
      </div>
      <div class="gauge">
        <span class="gauge-value">{{ trackCounts.completed }}</span>
        <span class="gauge-label">completed</span>
      </div>
      <div class="gauge">
        <span class="gauge-value" :class="{ warn: trackCounts.failed > 0 }">{{ trackCounts.failed }}</span>
        <span class="gauge-label">failed</span>
      </div>
      <div class="gauge">
        <span class="gauge-value">{{ trackCounts.retried }}</span>
        <span class="gauge-label">retried</span>
      </div>
    </div>

    <p class="session-note">counts since page load</p>

    <section>
      <div class="section-title">events</div>
      <div class="stream" v-if="queueEvents.length">
        <div v-for="(evt, i) in queueEvents" :key="i" class="event-row">
          <span class="event-action" :class="evt.type.split(':')[1]">{{ evt.type.split(':')[1] }}</span>
          <span class="event-data">{{ JSON.stringify(evt.data) }}</span>
          <span class="event-time">{{ new Date(evt.ts).toLocaleTimeString() }}</span>
        </div>
      </div>
      <p v-else class="empty" style="text-align: left; padding: 0;">no queue events yet</p>
    </section>
  </div>
</template>

<style scoped>
.gauges { display: flex; gap: 12px; margin-bottom: 8px; }
.gauge { flex: 1; padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; }
.gauge-value { display: block; font-size: 28px; font-weight: 600; color: var(--text-muted); }
.gauge-value.lit { color: var(--color-blue); }
.gauge-value.warn { color: var(--color-red); }
.gauge-label { display: block; font-size: 10px; color: var(--text-muted); margin-top: 4px; letter-spacing: 0.3px; text-transform: uppercase; }

.session-note { font-size: 10px; color: #333; margin-bottom: 24px; }

section { margin-top: 24px; }

.stream { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; max-height: 400px; overflow-y: auto; }
.event-row { display: flex; gap: 0; align-items: center; border-bottom: 1px solid var(--bg-raised); font-size: 11px; }
.event-row:last-child { border-bottom: none; }

.event-action { width: 72px; padding: 6px 10px; color: var(--text-muted); flex-shrink: 0; }
.event-action.complete { color: var(--color-green); }
.event-action.failed { color: var(--color-red); }
.event-action.retry { color: var(--color-yellow); }
.event-action.new { color: var(--text-muted); }
.event-action.drain { color: #666; }

.event-data { flex: 1; padding: 6px 8px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-time { width: 80px; padding: 6px 8px; color: #333; text-align: right; flex-shrink: 0; }
</style>
