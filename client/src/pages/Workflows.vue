<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'
import WorkflowGraph from '../components/WorkflowGraph.vue'
import JsonView from '../components/JsonView.vue'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import KeyValue from '../ui/components/KeyValue.vue'
import Badge from '../ui/components/Badge.vue'
import Button from '../ui/components/Button.vue'
import Modal from '../ui/components/Modal.vue'
import Textarea from '../ui/components/Textarea.vue'
import Callout from '../ui/components/Callout.vue'
import Breadcrumbs from '../ui/components/Breadcrumbs.vue'
import EmptyState from '../ui/components/EmptyState.vue'

// a workflow is cyclic if a DFS from start finds an edge back to a node already
// on the current path (a back-edge)
function isCyclic(graph) {
  const next = new Map((graph?.nodes ?? []).map((n) => [n.name, []]))
  for (const e of graph?.edges ?? []) if (next.has(e.from)) next.get(e.from).push(e.to)
  const onPath = new Set()
  const seen = new Set()
  let cyclic = false
  function dfs(name) {
    if (cyclic) return
    onPath.add(name)
    seen.add(name)
    for (const to of next.get(name) ?? []) {
      if (onPath.has(to)) { cyclic = true; return }
      if (!seen.has(to)) dfs(to)
    }
    onPath.delete(name)
  }
  if (graph?.start) dfs(graph.start)
  return cyclic
}

const route = useRoute()
const router = useRouter()

const workflows = ref([])
const selectedKey = ref('')
const selectedStep = ref('')
const loadError = ref(null)
const trail = ref([])
const mismatches = ref([])

const runOpen = ref(false)
const runInput = ref('{}')
const runError = ref(null)
const running = ref(false)

async function load() {
  const res = await fetch(api('/workflows'))
  if (!res.ok) {
    loadError.value = 'Failed to load workflows.'
    return
  }

  const data = await res.json()
  workflows.value = data.workflows
  mismatches.value = data.mismatches ?? []

  const requested = typeof route.query.workflow === 'string' ? route.query.workflow : ''
  const fallback = workflows.value[0] ? `${workflows.value[0].name}@${workflows.value[0].version}` : ''
  selectedKey.value = workflows.value.some((workflow) => `${workflow.name}@${workflow.version}` === requested)
    ? requested
    : fallback
}

onMounted(load)

watch(selectedKey, (value) => {
  if (!value) return
  router.replace({ query: { workflow: value } })
  const graph = selectedWorkflow.value?.graph
  selectedStep.value = graph?.start ?? ''
})

watch(
  () => route.query.workflow,
  (value) => {
    if (typeof value === 'string' && value !== selectedKey.value) selectedKey.value = value
  }
)

const selectedWorkflow = computed(() =>
  workflows.value.find((workflow) => `${workflow.name}@${workflow.version}` === selectedKey.value) ?? null
)

const selectedNode = computed(() =>
  selectedWorkflow.value?.graph?.nodes?.find((node) => node.name === selectedStep.value) ?? null
)

const nodeItems = computed(() => {
  const n = selectedNode.value
  if (!n) return []
  const items = [{ label: 'Type', value: n.type }]
  if (n.handler) items.push({ label: 'Handler', value: n.handler })
  items.push({ label: 'Timeout', value: n.timeout ?? '—' })
  items.push({ label: 'Max attempts', value: n.retry?.maxAttempts ?? 1 })
  if (n.retry?.backoff) items.push({ label: 'Backoff', value: String(n.retry.backoff) })
  if (n.maxPasses) items.push({ label: 'Max passes', value: n.maxPasses })
  return items
})

const nodeRoutes = computed(() => {
  const n = selectedNode.value
  const wf = selectedWorkflow.value
  if (!n || !wf) return []
  return wf.graph.edges
    .filter((e) => e.from === n.name)
    .map((e) => ({ label: e.label, to: e.to }))
})

const selectedCyclic = computed(() => isCyclic(selectedWorkflow.value?.graph))

function workflowName(key) {
  return workflows.value.find((w) => `${w.name}@${w.version}` === key)?.name ?? key
}

const childKey = computed(() => {
  const n = selectedNode.value
  if (!n || n.type !== 'subworkflow' || !n.workflow) return null
  const exact = `${n.workflow}@${n.version}`
  if (workflows.value.some((w) => `${w.name}@${w.version}` === exact)) return exact
  const byName = workflows.value.find((w) => w.name === n.workflow)
  return byName ? `${byName.name}@${byName.version}` : null
})

function selectWorkflow(key) {
  trail.value = []
  selectedKey.value = key
}

function drillIn() {
  if (!childKey.value) return
  trail.value = [...trail.value, selectedKey.value]
  selectedKey.value = childKey.value
}

const crumbs = computed(() =>
  [...trail.value, selectedKey.value].map((key, i) => ({ label: workflowName(key), key, index: i }))
)

function onCrumb(item) {
  trail.value = trail.value.slice(0, item.index)
  selectedKey.value = item.key
}

function openRun() {
  runInput.value = '{}'
  runError.value = null
  runOpen.value = true
}

async function submitRun() {
  if (!selectedWorkflow.value) return
  let input
  try {
    input = runInput.value.trim() ? JSON.parse(runInput.value) : {}
  } catch (err) {
    runError.value = `Invalid JSON: ${err.message}`
    return
  }

  running.value = true
  runError.value = null
  try {
    const res = await fetch(api('/workflow/start'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: selectedWorkflow.value.name,
        version: selectedWorkflow.value.version,
        input,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      runError.value = data.error || 'Failed to start workflow.'
      return
    }
    runOpen.value = false
    router.push({ path: '/executions', query: { execution: data.id } })
  } catch (err) {
    runError.value = err.message
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Definitions"
      title="Workflows"
      subtitle="Registered workflow definitions and their step graphs."
    >
      <template #actions>
        <Button variant="primary" icon="lucide:play" :disabled="!selectedWorkflow" @click="openRun">
          Run workflow
        </Button>
      </template>
    </PageHeader>

    <div class="page-body">
      <Callout v-if="mismatches.length" variant="warning" eyebrow="Instance mismatch" class="wf-mismatch">
        {{ mismatches.length }} workflow(s) are not registered on every instance:
        {{ mismatches.map((m) => `${m.name}@${m.version}`).join(', ') }}. This usually means an instance is running older code.
      </Callout>
      <EmptyState
        v-if="loadError"
        title="Could not load workflows"
        :description="loadError"
      />
      <EmptyState
        v-else-if="!workflows.length"
        title="No workflows registered"
        description="Workflow definitions will appear here once registered."
      />

      <div v-else class="wf-layout">
        <aside class="wf-list">
          <button
            v-for="workflow in workflows"
            :key="`${workflow.name}@${workflow.version}`"
            type="button"
            class="wf-card"
            :class="{ 'wf-card--active': `${workflow.name}@${workflow.version}` === selectedKey }"
            @click="selectWorkflow(`${workflow.name}@${workflow.version}`)"
          >
            <div class="wf-card__head">
              <span class="wf-card__name">{{ workflow.name }}</span>
              <Badge size="sm">v{{ workflow.version }}</Badge>
            </div>
            <div class="wf-card__meta">
              <span>{{ workflow.graph?.nodes?.length ?? 0 }} steps</span>
              <span v-if="isCyclic(workflow.graph)">· cyclic</span>
            </div>
          </button>
        </aside>

        <section v-if="selectedWorkflow" class="wf-detail">
          <Breadcrumbs
            v-if="trail.length"
            :items="crumbs"
            separator="›"
            @select="onCrumb"
          />
          <header class="wf-id">
            <div class="wf-id__core">
              <h2 class="wf-id__name">{{ selectedWorkflow.name }}</h2>
              <span class="wf-id__version">v{{ selectedWorkflow.version }}</span>
            </div>
            <dl class="wf-id__stats">
              <div>
                <dt>Start</dt>
                <dd>{{ selectedWorkflow.graph.start }}</dd>
              </div>
              <div>
                <dt>Steps</dt>
                <dd>{{ selectedWorkflow.graph.nodes.length }}</dd>
              </div>
              <div>
                <dt>Edges</dt>
                <dd>{{ selectedWorkflow.graph.edges.length }}</dd>
              </div>
              <div v-if="selectedCyclic">
                <dt>Flow</dt>
                <dd>cyclic</dd>
              </div>
            </dl>
          </header>
          <WorkflowGraph
            :graph="selectedWorkflow.graph"
            :selected-step="selectedStep"
            @select-step="selectedStep = $event"
          />

          <Panel v-if="selectedNode" :title="selectedNode.name">
            <PanelSection label="Step definition">
              <KeyValue layout="divided" boxed :items="nodeItems" />
              <p v-if="selectedNode.description" class="wf-node-desc">{{ selectedNode.description }}</p>
            </PanelSection>
            <PanelSection v-if="nodeRoutes.length" label="Routes">
              <div class="wf-routes">
                <div v-for="route in nodeRoutes" :key="`${route.label}->${route.to}`" class="wf-route">
                  <span class="wf-route__label">{{ route.label }}</span>
                  <span class="wf-route__arrow">→</span>
                  <span class="wf-route__to">{{ route.to }}</span>
                </div>
              </div>
            </PanelSection>
            <PanelSection v-if="selectedNode.params" label="Params">
              <JsonView :data="selectedNode.params" />
            </PanelSection>
            <PanelSection v-if="selectedNode.type === 'subworkflow'" label="Subworkflow">
              <div class="wf-sub-row">
                <span class="wf-sub-target">
                  {{ selectedNode.workflow }}<span v-if="selectedNode.version"> · v{{ selectedNode.version }}</span>
                </span>
                <Button
                  v-if="childKey"
                  size="sm"
                  variant="ghost"
                  icon="lucide:corner-down-right"
                  @click="drillIn"
                >Open workflow</Button>
                <span v-else class="wf-sub-missing">not registered</span>
              </div>
            </PanelSection>
          </Panel>
        </section>
      </div>
    </div>

    <Modal v-model="runOpen" :title="`Run ${selectedWorkflow?.name ?? 'workflow'}`">
      <div v-if="selectedWorkflow" class="run-modal">
        <p class="run-modal__meta">
          {{ selectedWorkflow.name }} · version {{ selectedWorkflow.version }}
        </p>
        <div class="run-modal__field">
          <label class="run-modal__label">Input (JSON)</label>
          <Textarea
            v-model="runInput"
            :rows="9"
            :invalid="!!runError"
            placeholder='{ "subject": "..." }'
          />
        </div>
        <p v-if="runError" class="run-modal__error">{{ runError }}</p>
      </div>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close">Cancel</Button>
        <Button variant="primary" :loading="running" loading-label="Starting" @click="submitRun">
          Run workflow
        </Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.wf-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
@media (max-width: 940px) {
  .wf-layout { grid-template-columns: 1fr; }
}

.wf-list { display: flex; flex-direction: column; gap: 6px; }
.wf-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  text-align: left;
  background: var(--paper, #fff);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.wf-card:hover:not(.wf-card--active) { background: var(--ink-04); border-color: var(--ink-20); }
.wf-card--active { background: var(--ink-08); border-color: var(--ink-20); }
.wf-card__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.wf-card__meta {
  display: flex;
  gap: 6px;
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-40);
}
.wf-card__name {
  font-size: 13px;
  letter-spacing: -0.1px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wf-detail { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.wf-id {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 22px;
  background: var(--paper, #fff);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
}
.wf-id__core { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
.wf-id__name {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: -0.2px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wf-id__version {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: var(--radius-sharp);
  background: var(--ink-08);
  color: var(--ink-60);
}
.wf-id__stats { display: flex; gap: 20px; margin: 0; }
.wf-id__stats div { display: flex; flex-direction: column; gap: 2px; align-items: flex-end; }
.wf-id__stats dt {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-40);
}
.wf-id__stats dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 14px;
  color: var(--ink);
}

.wf-node-desc {
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-60);
}

.wf-mismatch { margin-bottom: 16px; }

.wf-routes { display: flex; flex-direction: column; gap: 6px; }
.wf-route {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-family: var(--mono);
  font-size: 12.5px;
}
.wf-route__label {
  color: var(--ink);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
  background: var(--ink-04);
  border-radius: var(--radius-sharp);
  padding: 2px 7px;
}
.wf-route__arrow { color: var(--ink-40); }
.wf-route__to { color: var(--ink-60); }
.wf-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.wf-sub-target {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--ink);
}
.wf-sub-missing {
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-40);
}

.run-modal { display: flex; flex-direction: column; gap: 14px; }
.run-modal__meta {
  margin: 0;
  font-family: var(--mono);
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-60);
}
.run-modal__field { display: flex; flex-direction: column; gap: 6px; }
.run-modal__label {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 500;
  color: var(--ink-60);
}
.run-modal__error {
  margin: 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--status-failed);
}
</style>
