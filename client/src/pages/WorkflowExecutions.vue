<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'
import { useSSE } from '../sse.js'
import JsonView from '../components/JsonView.vue'
import WorkflowGraph from '../components/WorkflowGraph.vue'

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

let pollTimer = null

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

function formatRelative(ts) {
  if (!ts) return '-'
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

  pollTimer = setInterval(async () => {
    await loadExecutions()
    if (selectedId.value) await loadExecution(selectedId.value)
  }, 2000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

watch([statusFilter, workflowFilter], async () => {
  syncRoute()
  await loadExecutions()
  if (selectedId.value) await loadExecution(selectedId.value)
})

watch(selectedId, async (value) => {
  syncRoute()
  await loadExecution(value)
})

watch(
  () => events.value[0],
  async (event) => {
    if (!event?.type?.startsWith('workflow:')) return
    await loadExecutions()
    if (selectedId.value) await loadExecution(selectedId.value)
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

const filteredWorkflows = computed(() => workflows.value.map((workflow) => workflow.name))
</script>

<template>
  <div>
    <div class="section-title">workflow executions</div>

    <div class="filters">
      <select v-model="workflowFilter" class="select">
        <option value="">all workflows</option>
        <option v-for="name in filteredWorkflows" :key="name" :value="name">{{ name }}</option>
      </select>
      <select v-model="statusFilter" class="select">
        <option value="">all statuses</option>
        <option value="queued">queued</option>
        <option value="waiting">waiting</option>
        <option value="running">running</option>
        <option value="succeeded">succeeded</option>
        <option value="failed">failed</option>
        <option value="canceled">canceled</option>
      </select>
    </div>

    <div v-if="selectedExecution" class="headline">
      <div class="headline-name">{{ selectedExecution.workflow }}</div>
      <div class="headline-sub">{{ selectedExecution.status }} - {{ selectedExecution.id }}</div>
    </div>

    <div class="execution-layout">
      <aside class="list">
        <div
          v-for="execution in executions"
          :key="execution.id"
          class="execution-row"
          :class="[execution.status, { active: execution.id === selectedId }]"
          @click="selectedId = execution.id"
        >
          <div class="execution-main">
            <span class="execution-workflow">{{ execution.workflow }}</span>
            <span class="execution-id">{{ shortId(execution.id) }}</span>
          </div>
          <div class="execution-meta">
            <span>{{ execution.status }}</span>
            <span>{{ execution.currentStep || '-' }}</span>
            <span>{{ formatRelative(execution.updatedAt) }}</span>
          </div>
        </div>
        <p v-if="!executions.length" class="empty">no executions</p>
      </aside>

      <section class="center" v-if="selectedExecution && selectedWorkflow">
        <WorkflowGraph
          :graph="selectedWorkflow.graph"
          :execution="selectedExecution"
          :selected-step="selectedStep"
          @select-step="selectedStep = $event"
        />

        <div v-if="selectedExecution.input != null" class="card">
          <div class="card-header"><span class="name">input</span></div>
          <div class="card-body"><JsonView :data="selectedExecution.input" /></div>
        </div>
        <div v-if="selectedExecution.output != null" class="card">
          <div class="card-header"><span class="name">output</span></div>
          <div class="card-body"><JsonView :data="selectedExecution.output" /></div>
        </div>
        <div v-if="selectedExecution.error" class="card">
          <div class="card-header"><span class="name" style="color: var(--color-red);">error</span></div>
          <div class="card-body"><JsonView :data="selectedExecution.error" /></div>
        </div>
      </section>

      <aside class="inspector" v-if="selectedExecution && selectedWorkflow">
        <div class="card">
          <div class="card-header"><span class="name">execution</span></div>
          <div class="card-body">
            <div class="kv-row"><span class="kv-key">status</span><span class="kv-value">{{ selectedExecution.status }}</span></div>
            <div class="kv-row"><span class="kv-key">current</span><span class="kv-value">{{ selectedExecution.currentStep || 'terminal' }}</span></div>
            <div class="kv-row"><span class="kv-key">created</span><span class="kv-value">{{ new Date(selectedExecution.createdAt).toLocaleString() }}</span></div>
            <div class="kv-row"><span class="kv-key">updated</span><span class="kv-value">{{ new Date(selectedExecution.updatedAt).toLocaleString() }}</span></div>
          </div>
        </div>

        <div class="card" v-if="selectedStepState">
          <div class="card-header">
            <span class="name">step: {{ selectedStep }}</span>
          </div>
          <div class="card-body">
            <p class="step-hint">click a node in the graph to inspect</p>
            <div class="kv-row"><span class="kv-key">status</span><span class="kv-value">{{ selectedStepState.status }}</span></div>
            <div class="kv-row"><span class="kv-key">attempts</span><span class="kv-value">{{ selectedStepState.attempts }}</span></div>
            <div class="kv-row" v-if="selectedStepState.route"><span class="kv-key">route</span><span class="kv-value">{{ selectedStepState.route }}</span></div>
            <div class="kv-row" v-if="selectedStepState.startedAt"><span class="kv-key">started</span><span class="kv-value">{{ new Date(selectedStepState.startedAt).toLocaleTimeString() }}</span></div>
            <div class="kv-row" v-if="selectedStepState.endedAt"><span class="kv-key">ended</span><span class="kv-value">{{ new Date(selectedStepState.endedAt).toLocaleTimeString() }}</span></div>

            <div v-if="selectedStepState.output != null && selectedStepState.output !== selectedStepState.route" style="margin-top: 8px;">
              <div class="section-title">output</div>
              <JsonView :data="selectedStepState.output" />
            </div>
            <div v-if="selectedStepState.error" style="margin-top: 8px;">
              <div class="section-title" style="color: var(--color-red);">error</div>
              <JsonView :data="selectedStepState.error" />
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="name">journal</span></div>
          <div class="card-body" style="padding: 0;">
            <div class="timeline">
              <div v-for="(entry, index) in timeline" :key="index" class="timeline-row">
                <span class="timeline-type">{{ entry.type }}</span>
                <span class="timeline-step">{{ entry.step || entry.route || '-' }}</span>
                <span class="timeline-time">{{ new Date(entry.at).toLocaleTimeString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.filters { display: flex; gap: 8px; margin-bottom: 16px; }

.execution-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
.list { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 4px; overflow: hidden; max-height: calc(100vh - 240px); overflow-y: auto; }
.execution-row { padding: 10px 12px; border-bottom: 1px solid var(--bg-raised); cursor: pointer; }
.execution-row:last-child { border-bottom: none; }
.execution-row.active { background: var(--bg-raised); }
.execution-main { display: flex; justify-content: space-between; gap: 8px; }
.execution-workflow { color: var(--text-bright); font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.execution-id { color: #666; font-size: 11px; flex-shrink: 0; }
.execution-meta { display: flex; justify-content: space-between; gap: 6px; margin-top: 4px; color: var(--text-muted); font-size: 10px; }
.execution-row.running .execution-workflow { color: #8fb3ff; }
.execution-row.failed .execution-workflow { color: #d87a7a; }
.execution-row.succeeded .execution-workflow { color: #7ec49b; }

.headline { margin-bottom: 14px; }
.headline-name { font-size: 14px; font-weight: 600; color: var(--text-bright); }
.headline-sub { margin-top: 2px; color: var(--text-muted); font-size: 11px; }

.center { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.inspector { display: flex; flex-direction: column; gap: 10px; max-height: calc(100vh - 240px); overflow-y: auto; }

.step-hint { color: #383838; font-size: 10px; margin-bottom: 8px; font-style: italic; }

.timeline { max-height: 420px; overflow-y: auto; }
.timeline-row { display: flex; gap: 6px; align-items: baseline; border-bottom: 1px solid var(--border-subtle); padding: 6px 12px; font-size: 10px; white-space: nowrap; }
.timeline-row:last-child { border-bottom: none; }
.timeline-type { color: #b1b1b1; flex-shrink: 0; }
.timeline-step { color: #666; flex: 1; overflow: hidden; text-overflow: ellipsis; }
.timeline-time { color: var(--text-muted); flex-shrink: 0; }
</style>
