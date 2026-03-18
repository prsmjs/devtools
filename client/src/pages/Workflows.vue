<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'
import WorkflowGraph from '../components/WorkflowGraph.vue'

const route = useRoute()
const router = useRouter()

const workflows = ref([])
const selectedKey = ref('')
const selectedStep = ref('')
const loadError = ref(null)

async function load() {
  const res = await fetch(api('/workflows'))
  if (!res.ok) {
    loadError.value = 'failed to load workflows'
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
</script>

<template>
  <div>
    <div class="section-title">workflows</div>

    <div v-if="loadError" class="empty" style="text-align: left; padding: 0;">{{ loadError }}</div>
    <div v-else-if="!workflows.length" class="empty" style="text-align: left; padding: 0;">no workflows registered</div>
    <div v-else class="workflow-layout">
      <aside class="wf-sidebar">
        <div
          v-for="workflow in workflows"
          :key="`${workflow.name}@${workflow.version}`"
          class="card"
          :class="{ active: `${workflow.name}@${workflow.version}` === selectedKey }"
          style="cursor: pointer;"
          @click="selectedKey = `${workflow.name}@${workflow.version}`"
        >
          <div class="card-header">
            <span class="name">{{ workflow.name }}</span>
            <span class="badge">v{{ workflow.version }}</span>
          </div>
          <div class="card-body">
            <div class="kv-row">
              <span class="kv-key">steps</span>
              <span class="kv-value">{{ workflow.graph.nodes.length }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-key">start</span>
              <span class="kv-value">{{ workflow.graph.start }}</span>
            </div>
          </div>
        </div>
      </aside>

      <section class="detail" v-if="selectedWorkflow">
        <div class="headline">
          <div>
            <div class="headline-name">{{ selectedWorkflow.name }}</div>
            <div class="headline-sub">version {{ selectedWorkflow.version }}</div>
          </div>
          <div class="headline-stats">
            <span>{{ selectedWorkflow.graph.nodes.length }} steps</span>
            <span>{{ selectedWorkflow.graph.edges.length }} edges</span>
          </div>
        </div>

        <WorkflowGraph
          :graph="selectedWorkflow.graph"
          :selected-step="selectedStep"
          @select-step="selectedStep = $event"
        />

        <div class="card" v-if="selectedNode">
          <div class="card-header">
            <span class="name">{{ selectedNode.name }}</span>
          </div>
          <div class="card-body">
            <div class="kv-row">
              <span class="kv-key">type</span>
              <span class="kv-value">{{ selectedNode.type }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-key">timeout</span>
              <span class="kv-value">{{ selectedNode.timeout ?? '-' }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-key">retries</span>
              <span class="kv-value">{{ selectedNode.retry?.maxAttempts ?? 1 }}</span>
            </div>
            <p v-if="selectedNode.description" style="margin-top: 8px; color: #666; font-size: 11px;">{{ selectedNode.description }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.workflow-layout { display: grid; grid-template-columns: 280px 1fr; gap: 16px; }
.wf-sidebar { display: flex; flex-direction: column; gap: 8px; }
.wf-sidebar .card.active { border-color: var(--accent); }

.detail { display: flex; flex-direction: column; gap: 16px; }
.headline { display: flex; justify-content: space-between; align-items: flex-end; }
.headline-name { font-size: 14px; font-weight: 600; color: var(--text-bright); }
.headline-sub { margin-top: 2px; color: var(--text-muted); font-size: 11px; }
.headline-stats { display: flex; gap: 10px; color: var(--text-muted); font-size: 11px; }
</style>
