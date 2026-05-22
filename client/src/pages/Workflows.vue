<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'
import WorkflowGraph from '../components/WorkflowGraph.vue'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import KeyValue from '../ui/components/KeyValue.vue'
import Badge from '../ui/components/Badge.vue'
import Button from '../ui/components/Button.vue'
import Modal from '../ui/components/Modal.vue'
import Textarea from '../ui/components/Textarea.vue'
import Breadcrumbs from '../ui/components/Breadcrumbs.vue'
import EmptyState from '../ui/components/EmptyState.vue'

const route = useRoute()
const router = useRouter()

const workflows = ref([])
const selectedKey = ref('')
const selectedStep = ref('')
const loadError = ref(null)
const trail = ref([])

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
  return [
    { label: 'Type', value: n.type },
    { label: 'Timeout', value: n.timeout ?? '—' },
    { label: 'Retries', value: n.retry?.maxAttempts ?? 1 },
  ]
})

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
          </button>
        </aside>

        <section v-if="selectedWorkflow" class="wf-detail">
          <Breadcrumbs
            v-if="trail.length"
            :items="crumbs"
            separator="›"
            @select="onCrumb"
          />
          <Panel gradient elevated>
            <template #header>
              <h2 class="wf-title">{{ selectedWorkflow.name }}</h2>
              <p class="wf-sub">Version {{ selectedWorkflow.version }}</p>
            </template>
            <template #aside>
              <div class="wf-stats">
                <span>{{ selectedWorkflow.graph.nodes.length }} steps</span>
                <span class="wf-card__dot" />
                <span>{{ selectedWorkflow.graph.edges.length }} edges</span>
              </div>
            </template>
            <PanelSection flush>
              <WorkflowGraph
                :graph="selectedWorkflow.graph"
                :selected-step="selectedStep"
                @select-step="selectedStep = $event"
              />
            </PanelSection>
          </Panel>

          <Panel v-if="selectedNode" :title="selectedNode.name">
            <PanelSection label="Step definition">
              <KeyValue layout="divided" boxed :items="nodeItems" />
              <p v-if="selectedNode.description" class="wf-node-desc">{{ selectedNode.description }}</p>
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

.wf-list { display: flex; flex-direction: column; gap: 10px; }
.wf-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  text-align: left;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  cursor: pointer;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.wf-card:hover { border-color: var(--ink-20); box-shadow: var(--shadow-soft); }
.wf-card--active {
  border-color: var(--lavender);
  box-shadow: var(--shadow-soft);
}
.wf-card__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.wf-card__name {
  font-family: var(--display);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  color: var(--ink);
}
.wf-card__dot { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-20); }

.wf-detail { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
.wf-title {
  margin: 0;
  font-family: var(--display);
  font-size: 26px;
  font-weight: 500;
  letter-spacing: -0.5px;
  color: var(--ink);
}
.wf-sub { margin: 4px 0 0; font-size: 14px; color: var(--ink-60); }
.wf-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--ink-60);
}
.wf-node-desc {
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-60);
}
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
