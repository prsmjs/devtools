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

const resolvers = computed(() => props.config?.entitle ?? [])
const selected = ref(null)

const catalog = ref(null)
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
  effective.value = null
  describeError.value = null
  looked.value = false
  checks.value = {}
  if (!name) return
  try {
    const res = await fetch(api(`/entitle/${encodeURIComponent(name)}/catalog`))
    if (res.ok) catalog.value = await res.json()
  } catch {}
})

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
        <div v-if="resolvers.length > 1" class="ent-picker">
          <Select v-model="selected" :options="resolvers" size="sm" />
        </div>

        <div class="ent-grid">
          <Panel v-if="catalog">
            <template #header>
              <h3 class="ent-title">Plans</h3>
            </template>
            <template #aside>
              <Badge variant="dark">default: {{ catalog.defaultPlan }}</Badge>
            </template>
            <PanelSection v-for="(plan, name) in catalog.plans" :key="name" :label="name">
              <div class="plan">
                <div v-if="Object.keys(plan.features || {}).length" class="plan__group">
                  <span class="plan__heading">Features</span>
                  <div class="plan__chips">
                    <Badge
                      v-for="(on, f) in plan.features"
                      :key="f"
                      :variant="on ? 'active' : 'default'"
                      size="sm"
                    >{{ f }}</Badge>
                  </div>
                </div>
                <div v-if="Object.keys(plan.limits || {}).length" class="plan__group">
                  <span class="plan__heading">Limits</span>
                  <ul class="rows">
                    <li v-for="(v, k) in plan.limits" :key="k" class="row">
                      <code class="row__key">{{ k }}</code>
                      <span class="row__value">{{ fmtLimit(v) }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </PanelSection>
          </Panel>

          <Panel>
            <template #header>
              <h3 class="ent-title">Inspect a subject</h3>
            </template>
            <PanelSection>
              <form class="lookup" @submit.prevent="lookup">
                <Input v-model="subject" placeholder="Subject id (account, user, org…)" class="lookup__input" />
                <Button type="submit" variant="primary" :loading="looking" :disabled="!subject.trim()">Resolve</Button>
              </form>

              <p v-if="describeError" class="error">{{ describeError }}</p>

              <div v-if="effective" class="effective">
                <div class="effective__plan">
                  <span class="effective__label">Effective plan</span>
                  <Badge variant="solid">{{ effective.plan }}</Badge>
                </div>
              </div>
              <p v-else-if="looked && !describeError" class="empty">No entitlements resolved.</p>
            </PanelSection>

            <PanelSection v-if="effective" label="Features">
              <div v-if="featureList.length" class="chips">
                <Badge
                  v-for="[f, on] in featureList"
                  :key="f"
                  :variant="on ? 'active' : 'default'"
                  size="md"
                >{{ f }}<span class="chip__state">{{ on ? 'on' : 'off' }}</span></Badge>
              </div>
              <p v-else class="empty">No features.</p>
            </PanelSection>

            <PanelSection v-if="effective" label="Limits">
              <div class="check-period">
                <label>Usage period for checks</label>
                <Input v-model="checkPeriod" placeholder="default · 30 days · month" size="sm" />
              </div>
              <ul v-if="limitList.length" class="rows">
                <li v-for="[k, v] in limitList" :key="k" class="row row--limit">
                  <code class="row__key">{{ k }}</code>
                  <span class="row__value">{{ fmtLimit(v) }}</span>
                  <Button size="sm" variant="ghost" :loading="checking === k" @click="checkLimit(k)">Check usage</Button>
                  <span v-if="checks[k]" class="check">
                    <template v-if="checks[k].error">
                      <span class="check__err">{{ checks[k].error }}</span>
                    </template>
                    <template v-else>
                      <Badge :variant="checks[k].allowed ? 'active' : 'failed'" size="sm">
                        {{ checks[k].allowed ? 'within' : 'over' }}
                      </Badge>
                      <span class="check__detail">
                        {{ fmt(checks[k].used) }}<template v-if="checks[k].limit !== null"> / {{ fmt(checks[k].limit) }}</template>
                        {{ checks[k].unit }}
                      </span>
                    </template>
                  </span>
                </li>
              </ul>
              <p v-else class="empty">No limits.</p>
            </PanelSection>
          </Panel>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ent-picker { margin-bottom: 16px; }
.ent-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(420px, 2fr);
  gap: 16px;
  align-items: start;
}
@media (max-width: 900px) { .ent-grid { grid-template-columns: 1fr; } }
.ent-title {
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
.plan__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rows { list-style: none; margin: 0; padding: 0; }
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid var(--ink-08);
}
.row:first-child { border-top: 0; }
.row--limit { flex-wrap: wrap; }
.row__key {
  flex: 1;
  min-width: 0;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
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
.effective { margin-top: 14px; }
.effective__plan { display: flex; align-items: center; gap: 10px; }
.effective__label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  color: var(--ink-60);
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip__state {
  margin-left: 6px;
  opacity: 0.6;
  font-size: 0.85em;
}
.check-period {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 12px;
  max-width: 260px;
}
.check-period label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 9px;
  color: var(--ink-40);
}
.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.check__detail {
  font-size: 12px;
  color: var(--ink-60);
  font-variant-numeric: tabular-nums;
}
.check__err {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--status-failed);
}
.error {
  margin: 12px 0 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--status-failed);
}
.empty {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--ink-40);
}
</style>
