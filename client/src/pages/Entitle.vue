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

const resolvers = computed(() => props.config?.entitle ?? [])
const selected = ref(null)

const catalog = ref(null)
const subjectsList = ref([])
const subjectsLoaded = ref(false)
const subject = ref('')
const effective = ref(null)
const describeError = ref(null)
const looking = ref(false)
const looked = ref(false)

const checkPeriod = ref('')
const checks = ref({})
const checking = ref(null)

watch(
  resolvers,
  (list) => { if (list.length && (!selected.value || !list.includes(selected.value))) selected.value = list[0] },
  { immediate: true },
)

watch(selected, async (name) => {
  catalog.value = null
  subjectsList.value = []
  subjectsLoaded.value = false
  effective.value = null
  describeError.value = null
  looked.value = false
  checks.value = {}
  if (!name) return
  loadCatalog(name)
  loadSubjects()
})

async function loadCatalog(name) {
  try {
    const res = await fetch(api(`/entitle/${encodeURIComponent(name)}/catalog`))
    if (res.ok) catalog.value = await res.json()
  } catch {}
}

async function loadSubjects() {
  if (!selected.value) return
  try {
    const res = await fetch(api(`/entitle/${encodeURIComponent(selected.value)}/subjects?limit=50`))
    if (res.ok) subjectsList.value = (await res.json()).subjects ?? []
  } catch {} finally {
    subjectsLoaded.value = true
  }
}

const featureList = computed(() => effective.value ? Object.entries(effective.value.features) : [])
const limitList = computed(() => effective.value ? Object.entries(effective.value.limits) : [])

function fmtLimit(v) {
  if (v === null) return 'unlimited'
  if (v === 0) return 'denied'
  return typeof v === 'number' ? v.toLocaleString() : v
}

async function lookup() {
  const subj = subject.value.trim()
  if (!subj || !selected.value) return
  looking.value = true
  describeError.value = null
  effective.value = null
  checks.value = {}
  try {
    const res = await fetch(api(`/entitle/${encodeURIComponent(selected.value)}/describe?subject=${encodeURIComponent(subj)}`))
    const data = await res.json().catch(() => ({}))
    if (!res.ok) describeError.value = data.error || 'Lookup failed.'
    else effective.value = data
  } catch (err) {
    describeError.value = err.message
  } finally {
    looking.value = false
    looked.value = true
  }
}

function pick(subj) {
  subject.value = subj
  lookup()
}

async function checkLimit(key) {
  const subj = subject.value.trim()
  if (!subj || !selected.value) return
  checking.value = key
  try {
    const params = new URLSearchParams({ subject: subj, key })
    if (checkPeriod.value.trim()) params.set('period', checkPeriod.value.trim())
    const res = await fetch(api(`/entitle/${encodeURIComponent(selected.value)}/check?${params.toString()}`))
    const data = await res.json().catch(() => ({}))
    checks.value = { ...checks.value, [key]: res.ok ? data : { error: data.error || 'Check failed.' } }
  } catch (err) {
    checks.value = { ...checks.value, [key]: { error: err.message } }
  } finally {
    checking.value = null
  }
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString() : n
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Entitlements"
      title="Entitle"
      subtitle="Resolve a subject's effective plan, features, and limits, and check live usage against any quota."
    />

    <div class="page-body">
      <EmptyState
        v-if="!resolvers.length"
        title="No entitlements configured"
        description="A @prsm/entitle instance passed to devtools will appear here."
      />

      <template v-else>
        <div v-if="resolvers.length > 1" class="picker">
          <Select v-model="selected" :options="resolvers" size="sm" />
        </div>

        <div class="grid">
          <div class="col">
            <Panel v-if="catalog">
              <template #header>
                <h3 class="title">Plans</h3>
              </template>
              <template #aside>
                <Badge variant="dark">default: {{ catalog.defaultPlan }}</Badge>
              </template>
              <PanelSection v-for="(plan, name) in catalog.plans" :key="name" :label="name">
                <div class="plan">
                  <div v-if="Object.keys(plan.features || {}).length" class="plan__group">
                    <span class="plan__heading">Features</span>
                    <div class="chips">
                      <Badge v-for="(on, f) in plan.features" :key="f" :variant="on ? 'active' : 'default'" size="sm">{{ f }}</Badge>
                    </div>
                  </div>
                  <div v-if="Object.keys(plan.limits || {}).length" class="plan__group">
                    <span class="plan__heading">Limits</span>
                    <div class="table table--plan">
                      <div v-for="(v, k) in plan.limits" :key="k" class="trow">
                        <code class="c-key">{{ k }}</code>
                        <span class="c-value">{{ fmtLimit(v) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
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
                    <span class="srow__tags">
                      <Badge v-if="s.assigned" variant="default" size="sm">assigned</Badge>
                      <Badge v-if="s.overridden" variant="paused" size="sm">override</Badge>
                    </span>
                  </button>
                </ScrollArea>
                <p v-else class="muted">
                  {{ subjectsLoaded ? 'No subjects have an assignment or override yet.' : 'Loading…' }}
                </p>
                <p class="hint">Subjects on the default plan with no override are not stored, so they will not appear here.</p>
              </PanelSection>
            </Panel>
          </div>

          <Panel>
            <template #header>
              <h3 class="title">Inspect a subject</h3>
            </template>
            <PanelSection>
              <form class="lookup" @submit.prevent="lookup">
                <Input v-model="subject" placeholder="Subject id (account, user, org…)" class="lookup__input" />
                <Button type="submit" variant="primary" :loading="looking" :disabled="!subject.trim()">Resolve</Button>
              </form>

              <p v-if="describeError" class="error">{{ describeError }}</p>

              <div v-if="effective" class="effective">
                <span class="effective__label">Effective plan</span>
                <Badge variant="solid">{{ effective.plan }}</Badge>
              </div>
              <p v-else-if="looked && !describeError" class="muted">No entitlements resolved.</p>
            </PanelSection>

            <PanelSection v-if="effective" label="Features">
              <div v-if="featureList.length" class="chips">
                <Badge v-for="[f, on] in featureList" :key="f" :variant="on ? 'active' : 'default'" size="md">
                  {{ f }}<span class="chip__state">{{ on ? 'on' : 'off' }}</span>
                </Badge>
              </div>
              <p v-else class="muted">No features.</p>
            </PanelSection>

            <PanelSection v-if="effective" label="Limits">
              <div class="check-period">
                <label>Usage period for checks</label>
                <Input v-model="checkPeriod" placeholder="default · 30 days · month" size="sm" />
              </div>
              <div v-if="limitList.length" class="limits">
                <div v-for="[k, v] in limitList" :key="k" class="lim">
                  <div class="lim__main">
                    <code class="lim__key">{{ k }}</code>
                    <span class="lim__value">{{ fmtLimit(v) }}</span>
                    <Button class="lim__btn" size="sm" variant="ghost" :loading="checking === k" @click="checkLimit(k)">Check usage</Button>
                  </div>
                  <div v-if="checks[k]" class="lim__result">
                    <template v-if="checks[k].error">
                      <span class="lim__err">{{ checks[k].error }}</span>
                    </template>
                    <template v-else>
                      <Badge :variant="checks[k].allowed ? 'active' : 'failed'" size="sm">
                        {{ checks[k].allowed ? 'within' : 'over' }}
                      </Badge>
                      <span class="lim__detail">
                        used {{ fmt(checks[k].used) }}<template v-if="checks[k].limit !== null"> of {{ fmt(checks[k].limit) }}</template>
                        {{ checks[k].unit }}
                        <template v-if="checks[k].remaining !== null"> · {{ fmt(checks[k].remaining) }} left</template>
                      </span>
                    </template>
                  </div>
                </div>
              </div>
              <p v-else class="muted">No limits.</p>
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

.plan { display: flex; flex-direction: column; gap: 12px; }
.plan__group { display: flex; flex-direction: column; gap: 7px; }
.plan__heading {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 9px;
  color: var(--ink-40);
}
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip__state { margin-left: 6px; opacity: 0.6; font-size: 0.85em; }

.table { display: grid; column-gap: 14px; }
.table--plan { grid-template-columns: 1fr auto; }
.trow { display: contents; }
.trow > * { padding: 5px 0; align-self: center; min-width: 0; }
.c-key { font-family: var(--mono); font-size: 12px; color: var(--ink-60); }
.c-value {
  text-align: right;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.srow {
  display: flex;
  align-items: center;
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
.srow__tags { display: flex; gap: 5px; flex-shrink: 0; }

.lookup { display: flex; gap: 8px; }
.lookup__input { flex: 1; min-width: 0; }
.effective { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.effective__label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  color: var(--ink-60);
}

.check-period { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; max-width: 260px; }
.check-period label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 9px;
  color: var(--ink-40);
}

/* limit rows: button pinned right via fixed-width value, result on its own line so the
   button never shifts when a check returns */
.limits { display: flex; flex-direction: column; }
.lim { border-top: 1px solid var(--ink-08); }
.lim:first-child { border-top: 0; }
.lim__main { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.lim__key { flex: 1; min-width: 0; font-family: var(--mono); font-size: 12.5px; color: var(--ink); }
.lim__value {
  width: 96px;
  text-align: right;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.lim__btn { flex-shrink: 0; }
.lim__result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 10px;
}
.lim__detail { font-size: 12px; color: var(--ink-60); font-variant-numeric: tabular-nums; }
.lim__err { font-family: var(--mono); font-size: 11px; color: var(--status-failed); }

.error { margin: 12px 0 0; font-family: var(--mono); font-size: 12px; color: var(--status-failed); }
.muted { font-size: 13px; color: var(--ink-60); margin: 0; }
.hint { margin: 10px 0 0; font-size: 11.5px; color: var(--ink-40); line-height: 1.5; }
</style>
