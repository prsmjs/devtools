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

const props = defineProps({ config: Object })

const meters = computed(() => props.config?.meter ?? [])
const selected = ref(null)

const catalog = ref(null)
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

const AGG_TONE = { sum: 'default', max: 'active', last: 'draft', unique: 'warning' }

watch(
  meters,
  (list) => { if (list.length && (!selected.value || !list.includes(selected.value))) selected.value = list[0] },
  { immediate: true },
)

watch(selected, async (name) => {
  catalog.value = null
  summary.value = null
  summaryError.value = null
  looked.value = false
  metric.value = ''
  queryResult.value = null
  queryError.value = null
  if (!name) return
  try {
    const res = await fetch(api(`/meter/${encodeURIComponent(name)}/catalog`))
    if (res.ok) {
      catalog.value = await res.json()
      const keys = Object.keys(catalog.value.metrics ?? {})
      if (keys.length) metric.value = keys[0]
    }
  } catch {}
})

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
        <div v-if="meters.length > 1" class="meter-picker">
          <Select v-model="selected" :options="meters" size="sm" />
        </div>

        <div class="meter-grid">
          <Panel v-if="catalog">
            <template #header>
              <h3 class="meter-title">Catalog</h3>
            </template>
            <template #aside>
              <Badge variant="dark">{{ catalog.period }}</Badge>
            </template>
            <PanelSection>
              <ul class="rows">
                <li v-for="(def, name) in catalog.metrics" :key="name" class="row">
                  <code class="row__key">{{ name }}</code>
                  <Badge :variant="AGG_TONE[def.aggregate] || 'default'" size="sm">{{ def.aggregate }}</Badge>
                  <span class="row__unit">{{ def.unit }}</span>
                </li>
              </ul>
            </PanelSection>
          </Panel>

          <Panel>
            <template #header>
              <h3 class="meter-title">Inspect a subject</h3>
            </template>
            <PanelSection>
              <form class="lookup" @submit.prevent="lookup">
                <Input v-model="subject" placeholder="Subject id (account, tenant, user…)" class="lookup__input" />
                <Button type="submit" variant="primary" :loading="looking" :disabled="!subject.trim()">Look up</Button>
              </form>

              <p v-if="summaryError" class="error">{{ summaryError }}</p>

              <div v-if="summary" class="summary">
                <p class="summary__caption">Current period usage for <code>{{ summary.subject }}</code></p>
                <ul class="rows">
                  <li v-for="m in summary.metrics" :key="m.metric" class="row row--usage">
                    <code class="row__key">{{ m.metric }}</code>
                    <Badge :variant="AGG_TONE[m.aggregate] || 'default'" size="sm">{{ m.aggregate }}</Badge>
                    <span class="row__value">{{ fmt(m.quantity) }} <span class="row__unit">{{ m.unit }}</span></span>
                  </li>
                </ul>
              </div>
              <p v-else-if="looked && !summaryError" class="empty">No usage recorded for this subject.</p>
            </PanelSection>

            <PanelSection label="Query a window">
              <form class="query" @submit.prevent="runQuery">
                <div class="query__field">
                  <label>Metric</label>
                  <Select v-model="metric" :options="metricOptions" size="sm" placeholder="Pick a metric" />
                </div>
                <div class="query__field">
                  <label>Period</label>
                  <Input v-model="period" placeholder="month · 30 days · 15m" size="sm" />
                </div>
                <div class="query__field">
                  <label>Limit (optional)</label>
                  <Input v-model="limit" type="number" placeholder="quota" size="sm" />
                </div>
                <div class="query__field query__field--wide">
                  <label>Or explicit range (overrides period)</label>
                  <div class="query__range">
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
.meter-picker { margin-bottom: 16px; }
.meter-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(420px, 2fr);
  gap: 16px;
  align-items: start;
}
@media (max-width: 900px) { .meter-grid { grid-template-columns: 1fr; } }
.meter-title {
  margin: 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
}
.rows { list-style: none; margin: 0; padding: 0; }
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid var(--ink-08);
}
.row:first-child { border-top: 0; }
.row__key {
  flex: 1;
  min-width: 0;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__unit {
  font-size: 11px;
  color: var(--ink-40);
}
.row__value {
  flex-shrink: 0;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.lookup { display: flex; gap: 8px; }
.lookup__input { flex: 1; min-width: 0; }
.summary { margin-top: 16px; }
.summary__caption {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--ink-60);
}
.query {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}
.query__field { display: flex; flex-direction: column; gap: 5px; }
.query__field--wide { flex: 1 1 100%; }
.query__field label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 9px;
  color: var(--ink-40);
}
.query__range { display: flex; gap: 8px; }
.result {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--ink-04);
  border-radius: var(--radius-comfy);
}
.result__metric {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
}
.result__detail {
  font-size: 13px;
  color: var(--ink-60);
  font-variant-numeric: tabular-nums;
}
.error {
  margin: 12px 0 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--status-failed);
}
.empty {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--ink-40);
}
</style>
