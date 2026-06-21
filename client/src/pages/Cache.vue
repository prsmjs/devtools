<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { api } from '../api.js'
import { basePath } from '../base.js'
import { PageHeader, EmptyState, Panel, PanelSection, Badge } from 'pastel-vue'

const stats = ref({})
const loaded = ref(false)
const recentEvents = ref([])
const MAX_EVENTS = 50

let pollHandle = null
let sse = null

async function poll() {
  try {
    const res = await fetch(api('/cache'))
    if (res.ok) {
      stats.value = await res.json()
    }
  } catch {}
}

function summarize(s) {
  const total = s.hits + s.misses
  const hitRate = total > 0 ? (s.hits / total) * 100 : null
  return { total, hitRate }
}

const caches = computed(() => Object.entries(stats.value))

function pushEvent(kind, data) {
  recentEvents.value.unshift({ kind, data, ts: Date.now() })
  if (recentEvents.value.length > MAX_EVENTS) recentEvents.value.length = MAX_EVENTS
}

function eventsFor(cacheName) {
  return recentEvents.value.filter((e) => e.data?.cache === cacheName).slice(0, 8)
}

function eventLabel(kind) {
  return kind.replace(/^cache:/, '')
}

function eventTone(kind) {
  if (kind.includes('hit')) return 'active'
  if (kind.includes('miss') || kind.includes('refresh')) return 'default'
  if (kind.includes('stampede:lead') || kind.includes('stampede:wait')) return 'paused'
  if (kind.includes('invalidate') || kind.includes('del')) return 'failed'
  return 'default'
}

function eventTarget(e) {
  if (e.data?.key) return e.data.key
  if (e.data?.tag) return `tag: ${e.data.tag}` + (typeof e.data.count === 'number' ? ` (${e.data.count})` : '')
  return '—'
}

onMounted(async () => {
  await poll()
  loaded.value = true
  pollHandle = setInterval(poll, 1500)

  sse = new EventSource(`${basePath}/api/events`)
  const cacheEvents = ['cache:hit', 'cache:miss', 'cache:set', 'cache:del', 'cache:invalidate', 'cache:refresh', 'cache:stampede:lead', 'cache:stampede:wait', 'cache:stampede:result', 'cache:stampede:timeout']
  for (const ev of cacheEvents) {
    sse.addEventListener(ev, (e) => {
      try { pushEvent(ev, JSON.parse(e.data)) } catch {}
    })
  }
})

onBeforeUnmount(() => {
  if (pollHandle) clearInterval(pollHandle)
  if (sse) sse.close()
})
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Read-through cache"
      title="Cache"
      subtitle="Hit rate, stampede savings, and live activity for every registered cache."
    />

    <div class="page-body">
      <EmptyState
        v-if="loaded && !caches.length"
        title="No caches registered"
        description="Named caches passed to devtools will appear here."
      />
      <div v-else class="cache-grid">
        <Panel v-for="[name, s] in caches" :key="name">
          <template #header>
            <h3 class="cache-title">{{ name }}</h3>
          </template>
          <template #aside>
            <Badge variant="active">
              {{ summarize(s).hitRate !== null ? `${summarize(s).hitRate.toFixed(1)}% hit` : 'no traffic' }}
            </Badge>
          </template>
          <PanelSection>
            <dl class="stats">
              <div><dt>Hits</dt><dd>{{ s.hits }}</dd></div>
              <div><dt>Misses</dt><dd>{{ s.misses }}</dd></div>
              <div><dt>Sets</dt><dd>{{ s.sets }}</dd></div>
              <div><dt>Dels</dt><dd>{{ s.dels }}</dd></div>
              <div><dt>Refreshes</dt><dd>{{ s.refreshes }}</dd></div>
              <div><dt>Errors</dt><dd>{{ s.errors }}</dd></div>
              <div><dt>Invalidations</dt><dd>{{ s.invalidations }}</dd></div>
            </dl>
          </PanelSection>
          <PanelSection label="Stampede prevention">
            <dl class="stats">
              <div><dt>Leads</dt><dd>{{ s.stampedeLeads }}</dd></div>
              <div><dt>Waits</dt><dd>{{ s.stampedeWaits }}</dd></div>
              <div class="stats__highlight"><dt>Savings</dt><dd>{{ s.stampedeSavings }}</dd></div>
            </dl>
            <p class="stats__caption">
              Loader calls avoided by deduplicating concurrent misses for the same key.
            </p>
          </PanelSection>
          <PanelSection v-if="eventsFor(name).length" label="Recent activity (across all instances)">
            <ul class="events">
              <li v-for="(e, i) in eventsFor(name)" :key="i" class="event">
                <Badge :variant="eventTone(e.kind)" size="sm">{{ eventLabel(e.kind) }}</Badge>
                <code class="event__key">{{ eventTarget(e) }}</code>
                <span v-if="e.data?.instanceId" class="event__instance" :title="e.data.instanceId">{{ e.data.instanceId.slice(0, 6) }}</span>
                <span class="event__ts">{{ new Date(e.ts).toLocaleTimeString() }}</span>
              </li>
            </ul>
          </PanelSection>
        </Panel>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cache-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
  align-items: start;
}
.cache-title {
  margin: 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 14px 18px;
  margin: 0;
}
.stats div { display: flex; flex-direction: column; gap: 4px; }
.stats dt {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-40);
  margin: 0;
}
.stats dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 18px;
  letter-spacing: -0.5px;
  color: var(--ink);
}
.stats__highlight dd { color: var(--accent); }
.stats__caption {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--ink-60);
  line-height: 1.45;
}
.events { list-style: none; margin: 0; padding: 0; }
.event {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--ink-04);
}
.event:first-child { border-top: 0; }
.event__key {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event__instance {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-40);
  flex-shrink: 0;
}
.event__ts {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-40);
}
</style>
