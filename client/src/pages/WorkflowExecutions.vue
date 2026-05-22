<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'
import { useSSE } from '../sse.js'
import JsonView from '../components/JsonView.vue'
import WorkflowGraph from '../components/WorkflowGraph.vue'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import KeyValue from '../ui/components/KeyValue.vue'
import Select from '../ui/components/Select.vue'
import Badge from '../ui/components/Badge.vue'
import Button from '../ui/components/Button.vue'
import Modal from '../ui/components/Modal.vue'
import Textarea from '../ui/components/Textarea.vue'
import Callout from '../ui/components/Callout.vue'
import ScrollArea from '../ui/components/ScrollArea.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import { toast } from '../ui/composables/toast.js'

const route = useRoute()
const router = useRouter()
const events = useSSE()

const workflows = ref([])
const executions = ref([])
const selectedId = ref('')
const selectedExecution = ref(null)
const selectedStep = ref('')
const statusFilter = ref(typeof route.query.status === 'string' ? route.query.status : '')
const workflowFilter = ref(typeof route.query.workflow === 'string' ? route.query.workflow : '')

const now = ref(Date.now())

const signalOpen = ref(false)
const signalPayload = ref('{}')
const signalError = ref(null)
const signaling = ref(false)
const busy = ref(false)

let pollTimer = null
let tickTimer = null

async function loadWorkflows() {
  const res = await fetch(api('/workflows'))
  if (!res.ok) return
  const data = await res.json()
  workflows.value = data.workflows
}

async function loadExecutions() {
  const params = new URLSearchParams()
  if (statusFilter.value) params.set('status', statusFilter.value)
  if (workflowFilter.value) params.set('workflow', workflowFilter.value)
  params.set('limit', '100')

  const res = await fetch(api(`/workflow/executions?${params.toString()}`))
  if (!res.ok) return

  const data = await res.json()
  executions.value = data.executions

  if (!selectedId.value && executions.value[0]) {
    selectedId.value = executions.value[0].id
  }

  if (selectedId.value && !executions.value.some((execution) => execution.id === selectedId.value)) {
    selectedId.value = executions.value[0]?.id ?? ''
  }
}

async function loadExecution(id) {
  if (!id) {
    selectedExecution.value = null
    return
  }

  const res = await fetch(api(`/workflow/executions/${id}`))
  if (!res.ok) return
  const data = await res.json()
  selectedExecution.value = data.execution
  if (!selectedStep.value || !data.execution.steps[selectedStep.value]) {
    selectedStep.value = data.execution.currentStep || Object.keys(data.execution.steps)[0] || ''
  }
}

async function refresh() {
  await loadExecutions()
  if (selectedId.value) await loadExecution(selectedId.value)
}

function formatRelative(ts) {
  if (!ts) return '—'
  const ms = Date.now() - ts
  if (ms < 1000) return 'now'
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`
  return `${Math.floor(ms / 3600000)}h ago`
}

function shortId(id) {
  return id?.slice(0, 8) ?? ''
}

function syncRoute() {
  const query = {}
  if (workflowFilter.value) query.workflow = workflowFilter.value
  if (statusFilter.value) query.status = statusFilter.value
  if (selectedId.value) query.execution = selectedId.value
  router.replace({ query })
}

onMounted(async () => {
  await loadWorkflows()
  await loadExecutions()
  selectedId.value = typeof route.query.execution === 'string' ? route.query.execution : selectedId.value
  await loadExecution(selectedId.value)

  pollTimer = setInterval(refresh, 2000)
  tickTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (tickTimer) clearInterval(tickTimer)
})

watch([statusFilter, workflowFilter], async () => {
  syncRoute()
  await refresh()
})

watch(selectedId, async (value) => {
  syncRoute()
  await loadExecution(value)
})

watch(
  () => events.value[0],
  async (event) => {
    if (!event?.type?.startsWith('workflow:')) return
    await refresh()
  }
)

const selectedWorkflow = computed(() => {
  if (!selectedExecution.value) return null
  return workflows.value.find((workflow) =>
    workflow.name === selectedExecution.value.workflow &&
    workflow.version === selectedExecution.value.workflowVersion
  ) ?? null
})

watch([selectedExecution, selectedWorkflow], ([execution, workflow]) => {
  if (!execution || !workflow) return
  if (selectedStep.value && execution.steps[selectedStep.value]) return
  selectedStep.value = execution.currentStep || Object.keys(execution.steps)[0] || workflow.graph.start
})

const selectedStepState = computed(() =>
  selectedExecution.value?.steps?.[selectedStep.value] ?? null
)

const timeline = computed(() =>
  (selectedExecution.value?.journal ?? []).slice().sort((a, b) => b.at - a.at)
)

const currentStepNode = computed(() => {
  const wf = selectedWorkflow.value
  const step = selectedExecution.value?.currentStep
  if (!wf || !step) return null
  return wf.graph.nodes.find((n) => n.name === step) ?? null
})

const canSignal = computed(() =>
  selectedExecution.value?.status === 'suspended' && currentStepNode.value?.type === 'wait'
)

const canCancel = computed(() =>
  ['queued', 'waiting', 'running', 'suspended'].includes(selectedExecution.value?.status)
)

const canResume = computed(() =>
  selectedExecution.value?.status === 'failed' && selectedExecution.value?.currentStep != null
)

const waitRoutes = computed(() => {
  const wf = selectedWorkflow.value
  const step = selectedExecution.value?.currentStep
  if (!wf || !step) return []
  return wf.graph.edges.filter((ed) => ed.from === step).map((ed) => ed.label).filter(Boolean)
})

const waitDeadline = computed(() => {
  const e = selectedExecution.value
  if (!e || !e.currentStep) return null
  const entries = (e.journal ?? []).filter(
    (j) => j.type === 'step.suspended' && j.step === e.currentStep && j.timeoutAt
  )
  return entries.length ? entries[entries.length - 1].timeoutAt : null
})

const waitCountdown = computed(() => {
  if (!waitDeadline.value) return null
  const ms = waitDeadline.value - now.value
  if (ms <= 0) return 'firing now'
  return `${Math.ceil(ms / 1000)}s`
})

const workflowOptions = computed(() => [
  { value: '', label: 'All workflows' },
  ...workflows.value.map((w) => ({ value: w.name, label: w.name })),
])

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'running', label: 'Running' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'canceled', label: 'Canceled' },
]

function statusVariant(status) {
  switch (status) {
    case 'running': return 'paused'
    case 'succeeded': return 'active'
    case 'failed': return 'failed'
    case 'canceled': return 'draft'
    case 'waiting': return 'warning'
    default: return 'default'
  }
}

const executionItems = computed(() => {
  const e = selectedExecution.value
  if (!e) return []
  return [
    { label: 'Status', value: e.status },
    { label: 'Current step', value: e.currentStep || 'terminal' },
    { label: 'Created', value: new Date(e.createdAt).toLocaleString() },
    { label: 'Updated', value: new Date(e.updatedAt).toLocaleString() },
  ]
})

const stepItems = computed(() => {
  const s = selectedStepState.value
  if (!s) return []
  const items = [
    { label: 'Status', value: s.status },
    { label: 'Attempts', value: s.attempts },
  ]
  if (s.route) items.push({ label: 'Route', value: s.route })
  if (s.startedAt) items.push({ label: 'Started', value: new Date(s.startedAt).toLocaleTimeString() })
  if (s.endedAt) items.push({ label: 'Ended', value: new Date(s.endedAt).toLocaleTimeString() })
  if (s.idempotencyKey) items.push({ label: 'Idempotency key', value: s.idempotencyKey })
  return items
})

function openSignal() {
  signalPayload.value = waitRoutes.value.length
    ? `{ "route": "${waitRoutes.value[0]}" }`
    : '{}'
  signalError.value = null
  signalOpen.value = true
}

async function submitSignal() {
  let payload
  try {
    payload = signalPayload.value.trim() ? JSON.parse(signalPayload.value) : {}
  } catch (err) {
    signalError.value = `Invalid JSON: ${err.message}`
    return
  }

  signaling.value = true
  signalError.value = null
  try {
    const res = await fetch(api(`/workflow/executions/${selectedId.value}/signal`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      signalError.value = data.error || 'Signal failed.'
      return
    }
    signalOpen.value = false
    await refresh()
  } catch (err) {
    signalError.value = err.message
  } finally {
    signaling.value = false
  }
}

async function doAction(path, label, doneLabel) {
  busy.value = true
  try {
    const res = await fetch(api(`/workflow/executions/${selectedId.value}/${path}`), { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(`${label} failed`, { description: data.error || 'The action could not be completed.' })
    } else {
      toast.success(`Execution ${doneLabel}`)
    }
    await refresh()
  } catch (err) {
    toast.error(`${label} failed`, { description: err.message })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Runs"
      title="Executions"
      subtitle="Live and historical workflow runs, with per-step state and a journal timeline."
    >
      <template #actions>
        <Select v-model="workflowFilter" :options="workflowOptions" />
        <Select v-model="statusFilter" :options="statusOptions" />
      </template>
    </PageHeader>

    <div class="page-body">
      <div class="exec-layout">
        <aside class="exec-list">
          <Panel>
            <ScrollArea max-height="calc(100vh - 220px)">
              <button
                v-for="execution in executions"
                :key="execution.id"
                type="button"
                class="exec-row"
                :class="{ 'exec-row--active': execution.id === selectedId }"
                @click="selectedId = execution.id"
              >
                <div class="exec-row__top">
                  <span class="exec-row__name">{{ execution.workflow }}</span>
                  <Badge :variant="statusVariant(execution.status)" size="sm">{{ execution.status }}</Badge>
                </div>
                <div class="exec-row__meta">
                  <span class="exec-row__id">{{ shortId(execution.id) }}</span>
                  <span>{{ execution.currentStep || 'terminal' }}</span>
                  <span>{{ formatRelative(execution.updatedAt) }}</span>
                </div>
              </button>
              <EmptyState v-if="!executions.length" title="No executions" description="Runs matching the filters will appear here." />
            </ScrollArea>
          </Panel>
        </aside>

        <section v-if="selectedExecution && selectedWorkflow" class="exec-center">
          <Panel gradient elevated>
            <template #header>
              <h2 class="exec-title">{{ selectedExecution.workflow }}</h2>
              <p class="exec-sub">{{ selectedExecution.id }}</p>
            </template>
            <template #aside>
              <div class="exec-actions">
                <Badge :variant="statusVariant(selectedExecution.status)" dot>{{ selectedExecution.status }}</Badge>
                <Button v-if="canSignal" size="sm" variant="primary" icon="lucide:bell" @click="openSignal">
                  Signal
                </Button>
                <Button v-if="canResume" size="sm" variant="ghost" icon="lucide:rotate-ccw" :loading="busy" @click="doAction('resume', 'Resume', 'resumed')">
                  Resume
                </Button>
                <Button v-if="canCancel" size="sm" variant="danger" :loading="busy" @click="doAction('cancel', 'Cancel', 'canceled')">
                  Cancel
                </Button>
              </div>
            </template>
            <PanelSection flush>
              <WorkflowGraph
                :graph="selectedWorkflow.graph"
                :execution="selectedExecution"
                :selected-step="selectedStep"
                @select-step="selectedStep = $event"
              />
            </PanelSection>
          </Panel>

          <Panel v-if="selectedExecution.input != null" title="Input">
            <PanelSection><JsonView :data="selectedExecution.input" /></PanelSection>
          </Panel>
          <Panel v-if="selectedExecution.output != null" title="Output">
            <PanelSection><JsonView :data="selectedExecution.output" /></PanelSection>
          </Panel>
          <Panel v-if="selectedExecution.error" accent="lavender" title="Error">
            <PanelSection><JsonView :data="selectedExecution.error" /></PanelSection>
          </Panel>
        </section>

        <aside v-if="selectedExecution && selectedWorkflow" class="exec-inspector">
          <Panel title="Execution">
            <PanelSection>
              <KeyValue layout="divided" boxed compact :items="executionItems" />
            </PanelSection>
          </Panel>

          <Panel v-if="selectedStepState" :title="`Step · ${selectedStep}`">
            <PanelSection v-if="selectedStepState.status === 'awaiting' && waitCountdown" flush>
              <Callout variant="info" class="exec-wait" eyebrow="Waiting for signal">
                Timeout route fires in {{ waitCountdown }}.
              </Callout>
            </PanelSection>
            <PanelSection>
              <KeyValue layout="divided" boxed compact :items="stepItems" />
            </PanelSection>
            <PanelSection
              v-if="selectedStepState.output != null && selectedStepState.output !== selectedStepState.route"
              label="Output"
            >
              <JsonView :data="selectedStepState.output" />
            </PanelSection>
            <PanelSection v-if="selectedStepState.error" label="Error">
              <JsonView :data="selectedStepState.error" />
            </PanelSection>
          </Panel>

          <Panel title="Journal">
            <PanelSection flush>
              <div class="timeline">
                <div v-for="(entry, index) in timeline" :key="index" class="timeline__row">
                  <span class="timeline__type">{{ entry.type }}</span>
                  <span class="timeline__step">{{ entry.step || entry.route || '—' }}</span>
                  <span class="timeline__time">{{ new Date(entry.at).toLocaleTimeString() }}</span>
                </div>
                <EmptyState v-if="!timeline.length" title="No journal entries" />
              </div>
            </PanelSection>
          </Panel>
        </aside>
      </div>

      <EmptyState
        v-if="!executions.length && !selectedExecution"
        title="No executions yet"
        description="Workflow runs will appear here as they are queued and processed."
      />
    </div>

    <Modal v-model="signalOpen" title="Signal execution">
      <div class="signal-modal">
        <p v-if="waitRoutes.length" class="signal-modal__routes">
          Wait step routes to: {{ waitRoutes.join(', ') }}
        </p>
        <div class="signal-modal__field">
          <label class="signal-modal__label">Signal payload (JSON)</label>
          <Textarea
            v-model="signalPayload"
            :rows="6"
            :invalid="!!signalError"
            placeholder='{ "route": "resolved" }'
          />
        </div>
        <p v-if="signalError" class="signal-modal__error">{{ signalError }}</p>
      </div>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close">Cancel</Button>
        <Button variant="primary" :loading="signaling" loading-label="Sending" @click="submitSignal">
          Send signal
        </Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.exec-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 340px;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1180px) {
  .exec-layout { grid-template-columns: 1fr; }
}

.exec-list { min-width: 0; }
.exec-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 14px 18px;
  text-align: left;
  cursor: pointer;
  border-top: 1px solid var(--ink-08);
  transition: background 120ms ease;
}
.exec-row:first-child { border-top: 0; }
.exec-row:hover { background: var(--ink-04); }
.exec-row--active { background: rgba(189, 187, 255, 0.16); }
.exec-row__top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.exec-row__name {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.16px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exec-row__meta {
  display: flex;
  gap: 10px;
  font-family: var(--mono);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-40);
}
.exec-row__id { color: var(--ink-60); }

.exec-center { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.exec-title {
  margin: 0;
  font-family: var(--display);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.4px;
  color: var(--ink);
}
.exec-sub {
  margin: 4px 0 0;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--ink-60);
}
.exec-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.exec-wait { margin: 16px 24px 4px; }

.exec-inspector { display: flex; flex-direction: column; gap: 20px; min-width: 0; }

.timeline { max-height: 420px; overflow-y: auto; }
.timeline__row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 24px;
  border-top: 1px solid var(--ink-08);
  font-size: 12px;
}
.timeline__row:first-child { border-top: 0; }
.timeline__type {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--ink);
  flex-shrink: 0;
}
.timeline__step {
  flex: 1;
  min-width: 0;
  color: var(--ink-60);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.timeline__time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: var(--ink-40);
}

.signal-modal { display: flex; flex-direction: column; gap: 14px; }
.signal-modal__routes {
  margin: 0;
  font-family: var(--mono);
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-60);
}
.signal-modal__field { display: flex; flex-direction: column; gap: 6px; }
.signal-modal__label {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 500;
  color: var(--ink-60);
}
.signal-modal__error {
  margin: 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--status-failed);
}
</style>
