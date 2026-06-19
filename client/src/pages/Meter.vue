<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '../api.js'
import PageHeader from '../ui/components/PageHeader.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import Badge from '../ui/components/Badge.vue'
import Input from '../ui/components/Input.vue'
import Button from '../ui/components/Button.vue'
import Select from '../ui/components/Select.vue'
import ScrollArea from '../ui/components/ScrollArea.vue'

const props = defineProps({ config: Object })

const meters = computed(() => props.config?.meter ?? [])
const selected = ref(null)

const catalog = ref(null)
const subjectsList = ref([])
const subjectsLoaded = ref(false)
const subject = ref('')
const summary = ref(null)
const summaryError = ref(null)
const looking = ref(false)
const looked = ref(false)

const metric = ref('')
const period = ref('')
const rangeStart = ref('')
const rangeEnd = ref('')
const limit = ref('')
const queryResult = ref(null)
const queryError = ref(null)
const querying = ref(false)

// color + plain-language tooltip for each aggregate keyword (the badge shows the
// real keyword from the config, so the dashboard matches the API exactly)
const AGG = {
  sum: { tone: 'default', help: 'sum: every event added up over the period' },
  max: { tone: 'active', help: 'max: the high-water mark (peak) seen in the period' },
  last: { tone: 'draft', help: 'last: the most recently recorded value (a gauge)' },
  unique: { tone: 'warning', help: 'unique: count of distinct values seen in the period' },
}
const agg = (a) => AGG[a] ?? { tone: 'default', help: '' }

watch(
  meters,
  (list) => { if (list.length && (!selected.value || !list.includes(selected.value))) selected.value = list[0] },
  { immediate: true },
)

watch(selected, async (name) => {
  catalog.value = null
  subjectsList.value = []
  subjectsLoaded.value = false
  summary.value = null
  summaryError.value = null
  looked.value = false
  metric.value = ''
  queryResult.value = null
  queryError.value = null
  if (!name) return
  loadCatalog(name)
  loadSubjects()
})

async function loadCatalog(name) {
  try {
    const res = await fetch(api(`/meter/${encodeURIComponent(name)}/catalog`))
    if (res.ok) {
      catalog.value = await res.json()
      const keys = Object.keys(catalog.value.metrics ?? {})
      if (keys.length && !metric.value) metric.value = keys[0]
    }
  } catch {}
}

async function loadSubjects() {
  if (!selected.value) return
  try {
    const res = await fetch(api(`/meter/${encodeURIComponent(selected.value)}/subjects?limit=50`))
    if (res.ok) subjectsList.value = (await res.json()).subjects ?? []
  } catch {} finally {
    subjectsLoaded.value = true
  }
}

const metricOptions = computed(() => {
  if (catalog.value?.metrics) return Object.keys(catalog.value.metrics)
  if (summary.value?.metrics) return summary.value.metrics.map((m) => m.metric)
  return []
})

async function lookup() {
  const subj = subject.value.trim()
  if (!subj || !selected.value) return
  looking.value = true
  summaryError.value = null
  summary.value = null
  queryResult.value = null
  queryError.value = null
  try {
    const res = await fetch(api(`/meter/${encodeURIComponent(selected.value)}/summary?subject=${encodeURIComponent(subj)}`))
    const data = await res.json().catch(() => ({}))
    if (!res.ok) summaryError.value = data.error || 'Lookup failed.'
    else {
      summary.value = data
      if (!metric.value && data.metrics?.length) metric.value = data.metrics[0].metric
    }
  } catch (err) {
    summaryError.value = err.message
  } finally {
    looking.value = false
    looked.value = true
  }
}

function pick(subj) {
  subject.value = subj
  lookup()
}

async function runQuery() {
  const subj = subject.value.trim()
  if (!subj || !metric.value || !selected.value) return
  querying.value = true
  queryError.value = null
  queryResult.value = null
  try {
    const params = new URLSearchParams({ subject: subj, metric: metric.value })
    if (period.value.trim()) params.set('period', period.value.trim())
    if (rangeStart.value && rangeEnd.value) {
      params.set('rangeStart', new Date(rangeStart.value).toISOString())
      params.set('rangeEnd', new Date(rangeEnd.value).toISOString())
    }
    const hasLimit = limit.value !== '' && Number.isFinite(Number(limit.value))
    let path
    if (hasLimit) {
      params.set('limit', String(Number(limit.value)))
      path = `/meter/${encodeURIComponent(selected.value)}/check?${params.toString()}`
    } else {
      path = `/meter/${encodeURIComponent(selected.value)}/usage?${params.toString()}`
    }
    const res = await fetch(api(path))
    const data = await res.json().catch(() => ({}))
    if (!res.ok) queryError.value = data.error || 'Query failed.'
    else queryResult.value = { kind: hasLimit ? 'check' : 'usage', ...data }
  } catch (err) {
    queryError.value = err.message
  } finally {
    querying.value = false
  }
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString() : n
}
function ago(ts) {
  if (!ts) return ''
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Usage metering"
      title="Meter"
      subtitle="Inspect a subject's recorded usage, scope it to any window, and check it against a quota."
    />

    <div class="page-body">
      <EmptyState
        v-if="!meters.length"
        title="No meter configured"
        description="A @prsm/meter instance passed to devtools will appear here."
      />

      <template v-else>
        <div v-if="meters.length > 1" class="picker">
          <Select v-model="selected" :options="meters" size="sm" />
        </div>

        <div class="grid">
          <div class="col">
            <Panel v-if="catalog">
              <template #header>
                <h3 class="title">Catalog</h3>
              </template>
              <template #aside>
                <Badge variant="dark" :title="`Usage is materialized per ${catalog.period}`">{{ catalog.period }}</Badge>
              </template>
              <PanelSection>
                <div class="table table--catalog">
                  <div v-for="(def, name) in catalog.metrics" :key="name" class="trow">
                    <code class="c-metric">{{ name }}</code>
                    <span class="c-agg" :title="agg(def.aggregate).help">
                      <Badge :variant="agg(def.aggregate).tone" size="sm">{{ def.aggregate }}</Badge>
                    </span>
                    <span class="c-unit">{{ def.unit }}</span>
                  </div>
                </div>
                <p class="legend">
                  How each metric rolls up over the period: <b>sum</b> adds every event, <b>max</b> keeps the high-water mark,
                  <b>last</b> keeps the most recent value, <b>unique</b> counts distinct values.
                </p>
              </PanelSection>
            </Panel>

            <Panel>
              <template #header>
                <h3 class="title">Subjects</h3>
              </template>
              <template #aside>
                <Button size="sm" variant="ghost" @click="loadSubjects">Refresh</Button>
              </template>
              <PanelSection>
                <ScrollArea v-if="subjectsList.length" max-height="320px">
                  <button
                    v-for="s in subjectsList"
                    :key="s.subject"
                    type="button"
                    :class="['srow', { 'srow--active': s.subject === subject }]"
                    @click="pick(s.subject)"
                  >
                    <code class="srow__id">{{ s.subject }}</code>
                    <span class="srow__meta">{{ ago(s.lastActivityAt) }}</span>
                  </button>
                </ScrollArea>
                <p v-else class="muted">
                  {{ subjectsLoaded ? 'No subjects have recorded usage yet.' : 'Loading…' }}
                </p>
              </PanelSection>
            </Panel>
          </div>

          <Panel>
            <template #header>
              <h3 class="title">Inspect a subject</h3>
            </template>
            <PanelSection>
              <form class="lookup" @submit.prevent="lookup">
                <Input v-model="subject" placeholder="Subject id (account, tenant, user…)" class="lookup__input" />
                <Button type="submit" variant="primary" :loading="looking" :disabled="!subject.trim()">Look up</Button>
              </form>

              <p v-if="summaryError" class="error">{{ summaryError }}</p>

              <div v-if="summary" class="summary">
                <p class="muted">Current period usage for <code>{{ summary.subject }}</code></p>
                <div class="table table--usage">
                  <div v-for="m in summary.metrics" :key="m.metric" class="trow">
                    <code class="c-metric">{{ m.metric }}</code>
                    <span class="c-agg" :title="agg(m.aggregate).help">
                      <Badge :variant="agg(m.aggregate).tone" size="sm">{{ m.aggregate }}</Badge>
                    </span>
                    <span class="c-value">{{ fmt(m.quantity) }}</span>
                    <span class="c-unit">{{ m.unit }}</span>
                  </div>
                </div>
              </div>
              <p v-else-if="looked && !summaryError" class="muted">No usage recorded for this subject.</p>
            </PanelSection>

            <PanelSection label="Query a window">
              <form class="query" @submit.prevent="runQuery">
                <div class="field">
                  <label>Metric</label>
                  <Select v-model="metric" :options="metricOptions" size="sm" placeholder="Pick a metric" />
                </div>
                <div class="field">
                  <label>Period</label>
                  <Input v-model="period" placeholder="month · 30 days · 15m" size="sm" />
                </div>
                <div class="field">
                  <label>Limit (optional)</label>
                  <Input v-model="limit" type="number" placeholder="quota" size="sm" />
                </div>
                <div class="field field--wide">
                  <label>Or explicit range (overrides period)</label>
                  <div class="range">
                    <Input v-model="rangeStart" type="datetime-local" size="sm" />
                    <Input v-model="rangeEnd" type="datetime-local" size="sm" />
                  </div>
                </div>
                <Button type="submit" variant="primary" :loading="querying" :disabled="!metric || !subject.trim()">Run</Button>
              </form>

              <p v-if="queryError" class="error">{{ queryError }}</p>

              <div v-if="queryResult" class="result">
                <template v-if="queryResult.kind === 'check'">
                  <Badge :variant="queryResult.allowed ? 'active' : 'failed'">
                    {{ queryResult.allowed ? 'within limit' : 'over limit' }}
                  </Badge>
                  <span class="result__metric">{{ queryResult.metric }}</span>
                  <span class="result__detail">
                    {{ fmt(queryResult.used) }} / {{ fmt(queryResult.limit) }} {{ queryResult.unit }}
                    · {{ fmt(queryResult.remaining) }} left
                  </span>
                </template>
                <template v-else>
                  <Badge variant="dark">usage</Badge>
                  <span class="result__metric">{{ queryResult.metric }}</span>
                  <span class="result__detail">{{ fmt(queryResult.quantity) }} {{ queryResult.unit }}</span>
                </template>
              </div>
            </PanelSection>
          </Panel>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.picker { margin-bottom: 16px; }
.grid {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(440px, 1.8fr);
  gap: 16px;
  align-items: start;
}
@media (max-width: 920px) { .grid { grid-template-columns: 1fr; } }
.col { display: flex; flex-direction: column; gap: 16px; }
.title {
  margin: 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
}

/* aligned tables: one grid so columns line up across every row */
.table { display: grid; column-gap: 14px; }
.table--catalog { grid-template-columns: 1fr auto auto; }
.table--usage { grid-template-columns: 1fr auto auto auto; }
.trow { display: contents; }
.trow > * {
  padding: 9px 0;
  border-top: 1px solid var(--ink-08);
  align-self: center;
  min-width: 0;
}
.trow:first-child > * { border-top: 0; }
.c-metric {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.c-agg { justify-self: start; }
.c-value {
  text-align: right;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.c-unit { font-size: 11px; color: var(--ink-40); white-space: nowrap; }

.legend {
  margin: 14px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--ink-60);
}
.legend b { color: var(--ink); font-weight: 600; }

.srow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--radius-comfy);
  text-align: left;
  transition: background 120ms ease;
}
.srow:hover { background: var(--ink-04); }
.srow--active { background: var(--ink-08); }
.srow__id {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.srow__meta { flex-shrink: 0; font-size: 11px; color: var(--ink-40); }

.lookup { display: flex; gap: 8px; }
.lookup__input { flex: 1; min-width: 0; }
.summary { margin-top: 12px; }
.summary .muted { margin: 0 0 8px; }

.query { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field--wide { flex: 1 1 100%; }
.field label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 9px;
  color: var(--ink-40);
}
.range { display: flex; gap: 8px; }

.result {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--ink-04);
  border-radius: var(--radius-comfy);
}
.result__metric { font-family: var(--mono); font-size: 12.5px; color: var(--ink); }
.result__detail { font-size: 13px; color: var(--ink-60); font-variant-numeric: tabular-nums; }

.error { margin: 12px 0 0; font-family: var(--mono); font-size: 12px; color: var(--status-failed); }
.muted { font-size: 13px; color: var(--ink-60); }
</style>
