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
import Tooltip from '../ui/components/Tooltip.vue'
import Select from '../ui/components/Select.vue'
import Badge from '../ui/components/Badge.vue'
import Button from '../ui/components/Button.vue'
import Modal from '../ui/components/Modal.vue'
import Textarea from '../ui/components/Textarea.vue'
import Callout from '../ui/components/Callout.vue'
import ScrollArea from '../ui/components/ScrollArea.vue'
import Breadcrumbs from '../ui/components/Breadcrumbs.vue'
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
const trail = ref([])

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

  // don't auto-reselect while drilled into a child execution that isn't in the list
  if (
    !trail.value.length &&
    selectedId.value &&
    !executions.value.some((execution) => execution.id === selectedId.value)
  ) {
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
  // only pick a default step when nothing is selected; validity against the
  // workflow graph is enforced by the watcher, so a never-entered step stays put
  if (!selectedStep.value) {
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
  // keep the selection as long as it is a real step in this workflow, even if it
  // was never entered in this run (so you can inspect steps the run skipped)
  if (selectedStep.value && workflow.graph.nodes.some((node) => node.name === selectedStep.value)) return
  selectedStep.value = execution.currentStep || workflow.graph.start || Object.keys(execution.steps)[0] || ''
})

const selectedStepState = computed(() =>
  selectedExecution.value?.steps?.[selectedStep.value] ?? null
)

const childExecutionId = computed(() => selectedStepState.value?.childExecutionId ?? null)

function selectExecution(id) {
  trail.value = []
  selectedId.value = id
}

function drillIntoChild() {
  if (!childExecutionId.value || !selectedExecution.value) return
  trail.value = [...trail.value, { id: selectedId.value, label: selectedExecution.value.workflow }]
  selectedStep.value = ''
  selectedId.value = childExecutionId.value
}

const crumbs = computed(() => {
  const current = { label: selectedExecution.value?.workflow ?? 'execution', id: selectedId.value }
  return [...trail.value, current].map((c, i) => ({ label: c.label, id: c.id, index: i }))
})

function onCrumb(item) {
  trail.value = trail.value.slice(0, item.index)
  selectedStep.value = ''
  selectedId.value = item.id
}

const timeline = computed(() =>
  (selectedExecution.value?.journal ?? []).slice().sort((a, b) => b.at - a.at)
)

const currentStepNode = computed(() => {
  const wf = selectedWorkflow.value
  const step = selectedExecution.value?.currentStep
  if (!wf || !step) return null
  return wf.graph.nodes.find((n) => n.name === step) ?? null
})

const selectedStepNode = computed(() => {
  const wf = selectedWorkflow.value
  if (!wf || !selectedStep.value) return null
  return wf.graph.nodes.find((n) => n.name === selectedStep.value) ?? null
})

function entryDetail(entry) {
  if (entry.route) return entry.route
  if (entry.type === 'step.reentered' && entry.pass) return `pass ${entry.pass}`
  if ((entry.type === 'step.started' || entry.type === 'step.retry-scheduled') && entry.attempt) {
    return `attempt ${entry.attempt}`
  }
  if (entry.type === 'execution.paused' && entry.from) return `from ${entry.from}`
  if (entry.type === 'step.skipped' && entry.reason) return entry.reason
  return null
}

const canSignal = computed(() =>
  selectedExecution.value?.status === 'suspended' && currentStepNode.value?.type === 'wait'
)

const canCancel = computed(() =>
  ['queued', 'waiting', 'running', 'suspended', 'paused'].includes(selectedExecution.value?.status)
)

const canPause = computed(() =>
  ['queued', 'waiting', 'running', 'suspended'].includes(selectedExecution.value?.status)
)

const canResume = computed(() => {
  const e = selectedExecution.value
  if (!e) return false
  if (e.status === 'paused') return true
  return e.status === 'failed' && e.currentStep != null
})

const isPausedResume = computed(() => selectedExecution.value?.status === 'paused')

const pausedInfo = computed(() => {
  const e = selectedExecution.value
  if (!e || e.status !== 'paused') return null
  const entries = (e.journal ?? []).filter((j) => j.type === 'execution.paused')
  const last = entries[entries.length - 1]
  return { reason: last?.reason ?? 'Paused', from: e.pausedFrom ?? last?.from ?? null }
})

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

const hasData = computed(() => {
  const d = selectedExecution.value?.data
  return d && typeof d === 'object' && Object.keys(d).length > 0
})

const hasMetadata = computed(() => {
  const m = selectedExecution.value?.metadata
  return m && typeof m === 'object' && Object.keys(m).length > 0
})

const executionTags = computed(() => selectedExecution.value?.tags ?? [])

const stepRetries = computed(() => {
  const e = selectedExecution.value
  if (!e || !selectedStep.value) return []
  return (e.journal ?? [])
    .filter((j) => j.type === 'step.retry-scheduled' && j.step === selectedStep.value)
    .map((j) => ({
      attempt: j.attempt,
      message: j.error?.message ?? 'error',
      retryAt: j.availableAt,
    }))
})

// only when we landed on a child directly (no breadcrumb trail); drilling in
// already gives breadcrumbs back up
const parentLink = computed(() => {
  const e = selectedExecution.value
  if (!e?.parent || trail.value.length) return null
  return { id: e.parent.executionId, step: e.parent.step }
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
  { value: 'suspended', label: 'Suspended' },
  { value: 'paused', label: 'Paused' },
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
    case 'paused': return 'draft'
    case 'waiting': return 'warning'
    case 'suspended': return 'warning'
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

const STEP_TYPE_HINT = {
  activity: 'Activity step: runs your handler code, then advances to the next step.',
  decision: 'Decision step: runs code that returns one of the named routes, branching the workflow.',
  wait: 'Wait step: pauses the run until a signal arrives (or a timeout transition fires).',
  subworkflow: 'Subworkflow step: starts another workflow and waits for it to finish.',
  succeed: 'Terminal step: ends the run successfully with its result as the output.',
  fail: 'Terminal step: ends the run as failed.',
}

const stepItems = computed(() => {
  const s = selectedStepState.value
  if (!s) return []
  const items = [
    { label: 'Status', value: s.status, hint: 'This step’s state in this run: pending, running, succeeded, failed, or awaiting (parked waiting on a signal or child).' },
    { label: 'Attempts', value: s.attempts, hint: 'Times this step has run in the current pass, including retries. 1 means it succeeded on the first try.' },
  ]
  const maxPasses = selectedStepNode.value?.maxPasses
  if (s.pass > 1 || maxPasses) {
    items.push({
      label: 'Pass',
      value: maxPasses ? `${s.pass ?? 1} / ${maxPasses}` : s.pass ?? 1,
      hint: 'Loop iteration. A cyclic workflow can route back into this step; pass 5 means it has been entered 5 times. Shown as current / max passes when a cap is set.',
    })
  }
  if (s.route) {
    const edge = selectedWorkflow.value?.graph.edges.find((e) => e.from === selectedStep.value && e.label === s.route)
    items.push({
      label: 'Route',
      value: edge?.to ? `${s.route} → ${edge.to}` : s.route,
      hint: 'For decision and wait steps, the branch this step took and the step it routed to next.',
    })
  }
  if (s.startedAt) items.push({ label: 'Started', value: new Date(s.startedAt).toLocaleTimeString(), hint: 'When this step last began running.' })
  if (s.endedAt) items.push({ label: 'Ended', value: new Date(s.endedAt).toLocaleTimeString(), hint: 'When this step last finished.' })
  return items
})

const definitionItems = computed(() => {
  const n = selectedStepNode.value
  if (!n) return []
  const items = [{ label: 'Type', value: n.type, hint: STEP_TYPE_HINT[n.type] ?? 'The kind of step.' }]
  if (n.handler) items.push({ label: 'Handler', value: n.handler, hint: 'Named function bound to this step from the engine’s handler registry.' })
  if (n.type === 'subworkflow' && n.workflow) {
    items.push({ label: 'Subworkflow', value: n.version ? `${n.workflow}@${n.version}` : n.workflow, hint: 'The child workflow this step runs.' })
  }
  if (n.timeout != null) items.push({ label: 'Timeout', value: String(n.timeout), hint: 'Maximum time this step may run before it is aborted.' })
  if (n.retry?.maxAttempts > 1) items.push({ label: 'Max attempts', value: n.retry.maxAttempts, hint: 'How many times a single pass may retry before the step is marked failed.' })
  if (n.retry?.backoff) items.push({ label: 'Backoff', value: String(n.retry.backoff), hint: 'Delay between retry attempts.' })
  if (n.maxPasses) items.push({ label: 'Max passes', value: n.maxPasses, hint: 'How many times a cycle may re-enter this step before the run errors out.' })
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
                @click="selectExecution(execution.id)"
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
          <Breadcrumbs
            v-if="trail.length"
            :items="crumbs"
            separator="›"
            @select="onCrumb"
          />
          <header class="exec-id">
            <div class="exec-id__core">
              <h2 class="exec-id__name">{{ selectedExecution.workflow }}</h2>
              <code class="exec-id__hash">{{ selectedExecution.id }}</code>
            </div>
            <div class="exec-id__actions">
              <Badge :variant="statusVariant(selectedExecution.status)" dot>{{ selectedExecution.status }}</Badge>
              <Button v-if="canSignal" size="sm" variant="primary" icon="lucide:bell" @click="openSignal">
                Signal
              </Button>
              <Button v-if="canPause" size="sm" variant="ghost" icon="lucide:pause" :loading="busy" @click="doAction('pause', 'Pause', 'paused')">
                Pause
              </Button>
              <Button
                v-if="canResume"
                size="sm"
                variant="ghost"
                :icon="isPausedResume ? 'lucide:play' : 'lucide:rotate-ccw'"
                :loading="busy"
                @click="doAction('resume', isPausedResume ? 'Resume' : 'Retry', 'resumed')"
              >
                {{ isPausedResume ? 'Resume' : 'Retry' }}
              </Button>
              <Button v-if="canCancel" size="sm" variant="danger" :loading="busy" @click="doAction('cancel', 'Cancel', 'canceled')">
                Cancel
              </Button>
            </div>
          </header>
          <Callout v-if="pausedInfo" variant="warning" eyebrow="Paused">
            {{ pausedInfo.reason }}<template v-if="pausedInfo.from"> · was {{ pausedInfo.from }}</template>. Resume to continue from where it left off.
          </Callout>
          <WorkflowGraph
            :graph="selectedWorkflow.graph"
            :execution="selectedExecution"
            :selected-step="selectedStep"
            @select-step="selectedStep = $event"
          />

          <Panel v-if="hasData" title="Data">
            <PanelSection>
              <p class="exec-panel-hint">Accumulated workflow state. Activity outputs merge into this, and decision and wait steps branch on it.</p>
              <JsonView :data="selectedExecution.data" />
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
          <Panel v-if="hasMetadata" title="Metadata">
            <PanelSection><JsonView :data="selectedExecution.metadata" /></PanelSection>
          </Panel>
        </section>

        <aside v-if="selectedExecution && selectedWorkflow" class="exec-inspector">
          <Panel title="Execution">
            <PanelSection>
              <KeyValue layout="divided" boxed compact :items="executionItems" />
            </PanelSection>
            <PanelSection v-if="executionTags.length" label="Tags">
              <div class="exec-tags">
                <Badge v-for="tag in executionTags" :key="tag" size="sm">{{ tag }}</Badge>
              </div>
            </PanelSection>
            <PanelSection v-if="parentLink" label="Parent execution">
              <div class="exec-sub-row">
                <span class="exec-sub-id">{{ parentLink.id.slice(0, 8) }} · {{ parentLink.step }}</span>
                <Button size="sm" variant="ghost" icon="lucide:corner-left-up" @click="selectExecution(parentLink.id)">
                  Open parent
                </Button>
              </div>
            </PanelSection>
          </Panel>

          <Panel v-if="selectedStep && (selectedStepState || selectedStepNode)" :title="`Step · ${selectedStep}`">
            <PanelSection v-if="selectedStepState?.status === 'awaiting' && waitCountdown" flush>
              <Callout variant="info" class="exec-wait" eyebrow="Waiting for signal">
                Timeout route fires in {{ waitCountdown }}.
              </Callout>
            </PanelSection>
            <PanelSection v-if="selectedStepState">
              <KeyValue layout="divided" boxed compact :items="stepItems">
                <template #label="{ item }">
                  <Tooltip v-if="item.hint" placement="left">
                    <template #content><span class="kv-hint__text">{{ item.hint }}</span></template>
                    <span class="kv-hint">{{ item.label }}</span>
                  </Tooltip>
                  <template v-else>{{ item.label }}</template>
                </template>
              </KeyValue>
            </PanelSection>
            <PanelSection v-if="definitionItems.length" label="Definition">
              <KeyValue layout="divided" boxed compact :items="definitionItems">
                <template #label="{ item }">
                  <Tooltip v-if="item.hint" placement="left">
                    <template #content><span class="kv-hint__text">{{ item.hint }}</span></template>
                    <span class="kv-hint">{{ item.label }}</span>
                  </Tooltip>
                  <template v-else>{{ item.label }}</template>
                </template>
              </KeyValue>
              <p v-if="selectedStepNode?.description" class="exec-step-desc">{{ selectedStepNode.description }}</p>
            </PanelSection>
            <PanelSection v-if="selectedStepNode?.params" label="Params">
              <JsonView :data="selectedStepNode.params" />
            </PanelSection>
            <PanelSection v-if="childExecutionId" label="Subworkflow">
              <div class="exec-sub-row">
                <span class="exec-sub-id">{{ childExecutionId.slice(0, 8) }}</span>
                <Button size="sm" variant="ghost" icon="lucide:corner-down-right" @click="drillIntoChild">
                  Open child execution
                </Button>
              </div>
            </PanelSection>
            <PanelSection
              v-if="selectedStepState?.output != null && selectedStepState.output !== selectedStepState.route"
              label="Output"
            >
              <JsonView :data="selectedStepState.output" />
            </PanelSection>
            <PanelSection v-if="selectedStepState?.error" label="Error">
              <JsonView :data="selectedStepState.error" />
            </PanelSection>
            <PanelSection v-if="stepRetries.length" label="Retry history">
              <div class="exec-retries">
                <div v-for="(retry, index) in stepRetries" :key="index" class="exec-retry">
                  <span class="exec-retry__attempt">attempt {{ retry.attempt }}</span>
                  <span class="exec-retry__msg">{{ retry.message }}</span>
                  <span class="exec-retry__time">retry {{ new Date(retry.retryAt).toLocaleTimeString() }}</span>
                </div>
              </div>
            </PanelSection>
          </Panel>

          <Panel title="Journal">
            <PanelSection flush>
              <div class="timeline">
                <div v-for="(entry, index) in timeline" :key="index" class="timeline__row">
                  <span class="timeline__type">{{ entry.type }}</span>
                  <span class="timeline__step">{{ entry.step || entry.route || '—' }}</span>
                  <span v-if="entryDetail(entry)" class="timeline__detail">{{ entryDetail(entry) }}</span>
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
.exec-row:hover:not(.exec-row--active) { background: var(--ink-04); }
.exec-row--active { background: var(--ink-08); }
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

.exec-center { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.exec-id {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 22px;
  background: var(--paper, #fff);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
}
.exec-id__core { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.exec-id__name {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.2px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exec-id__hash {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exec-id__actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
.exec-wait { margin: 16px 24px 4px; }

.exec-inspector { display: flex; flex-direction: column; gap: 20px; min-width: 0; }

.exec-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.exec-sub-id {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink-60);
}

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
.timeline__detail {
  flex-shrink: 0;
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-60);
  background: var(--ink-04);
  border-radius: var(--radius-sharp);
  padding: 1px 6px;
}
.timeline__time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: var(--ink-40);
}

.exec-step-desc {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-60);
}

.exec-panel-hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-60);
}

.exec-tags { display: flex; flex-wrap: wrap; gap: 6px; }

.exec-retries { display: flex; flex-direction: column; gap: 8px; }
.exec-retry {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 12px;
}
.exec-retry__attempt {
  flex-shrink: 0;
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-60);
}
.exec-retry__msg {
  flex: 1;
  min-width: 0;
  color: var(--status-failed);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exec-retry__time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  color: var(--ink-40);
}

.kv-hint {
  border-bottom: 1px dotted var(--ink-30, var(--ink-20));
  cursor: help;
}
.kv-hint__text {
  display: block;
  max-width: 260px;
  white-space: normal;
  line-height: 1.45;
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
