<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { api } from '../api.js'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import Tabs from '../ui/components/Tabs.vue'
import Badge from '../ui/components/Badge.vue'
import Button from '../ui/components/Button.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import { toast } from '../ui/composables/toast.js'

const props = defineProps({ config: Object })

const managers = computed(() => props.config?.lock ?? [])
const current = ref(null)
const kind = ref(null)
const locks = ref([])
const busy = ref(null)

let pollTimer = null

watch(managers, (list) => {
  if (list.length && !list.includes(current.value)) current.value = list[0]
}, { immediate: true })

watch(current, () => {
  kind.value = null
  locks.value = []
  poll()
})

async function poll() {
  if (!current.value) return
  const res = await fetch(api(`/locks/${encodeURIComponent(current.value)}`))
  if (res.ok) {
    const data = await res.json()
    if (data.name === current.value) {
      kind.value = data.kind
      locks.value = data.locks
    }
  }
}

onMounted(() => {
  poll()
  pollTimer = setInterval(poll, 2000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

function formatTtl(ms) {
  if (ms == null || ms < 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function shortId(id) {
  return id?.length > 12 ? `${id.slice(0, 12)}…` : id
}

async function release(key, id) {
  busy.value = `${key}::${id}`
  try {
    const res = await fetch(api(`/locks/${encodeURIComponent(current.value)}/release`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error('Release failed', { description: data.error || 'The lock could not be released.' })
    } else if (data.released === false) {
      toast.warning('Lock not released', {
        description: 'It had already expired or been re-acquired by another holder.',
      })
    } else {
      toast.success('Lock released')
    }
    await poll()
  } catch (err) {
    toast.error('Release failed', { description: err.message })
  } finally {
    busy.value = null
  }
}

const semaphoreRows = computed(() => {
  if (kind.value !== 'semaphore') return []
  const rows = []
  for (const sem of locks.value) {
    for (const holder of sem.holders) {
      rows.push({ key: sem.key, holder, active: sem.active, max: sem.max })
    }
  }
  return rows
})
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Coordination"
      title="Locks"
      subtitle="Held mutexes and semaphore leases - who holds what, and for how long."
    >
      <template #actions>
        <Tabs
          v-if="managers.length > 1"
          :model-value="current"
          :tabs="managers.map((m) => ({ value: m, label: m }))"
          variant="pills"
          @update:model-value="current = $event"
        />
      </template>
    </PageHeader>

    <div class="page-body">
      <section class="page-section">
        <Panel :title="kind === 'semaphore' ? 'Semaphore leases' : 'Held locks'">
          <template v-if="kind" #aside>
            <Badge :variant="kind === 'semaphore' ? 'paused' : 'default'" size="sm">{{ kind }}</Badge>
          </template>

          <!-- mutex -->
          <div v-if="kind === 'mutex'">
            <div v-if="locks.length" class="ltable">
              <div class="ltable__head">
                <span class="ltable__col ltable__col--key">Key</span>
                <span class="ltable__col ltable__col--holder">Holder</span>
                <span class="ltable__col ltable__col--ttl">Expires in</span>
                <span class="ltable__col ltable__col--action" />
              </div>
              <div v-for="l in locks" :key="l.key" class="ltable__row">
                <span class="ltable__col ltable__col--key">{{ l.key }}</span>
                <span class="ltable__col ltable__col--holder">{{ l.holder }}</span>
                <span class="ltable__col ltable__col--ttl">{{ formatTtl(l.ttl) }}</span>
                <span class="ltable__col ltable__col--action">
                  <Button
                    size="sm"
                    variant="danger"
                    :loading="busy === `${l.key}::${l.holder}`"
                    @click="release(l.key, l.holder)"
                  >Release</Button>
                </span>
              </div>
            </div>
            <EmptyState v-else title="No locks held" description="Mutex locks appear here while they are held." />
          </div>

          <!-- semaphore -->
          <div v-else-if="kind === 'semaphore'">
            <div v-if="semaphoreRows.length" class="ltable">
              <div class="ltable__head">
                <span class="ltable__col ltable__col--key">Semaphore</span>
                <span class="ltable__col ltable__col--holder">Lease holder</span>
                <span class="ltable__col ltable__col--ttl">Occupancy</span>
                <span class="ltable__col ltable__col--action" />
              </div>
              <div v-for="row in semaphoreRows" :key="`${row.key}::${row.holder}`" class="ltable__row">
                <span class="ltable__col ltable__col--key">{{ row.key }}</span>
                <span class="ltable__col ltable__col--holder" :title="row.holder">{{ shortId(row.holder) }}</span>
                <span class="ltable__col ltable__col--ttl">{{ row.active }} / {{ row.max }}</span>
                <span class="ltable__col ltable__col--action">
                  <Button
                    size="sm"
                    variant="danger"
                    :loading="busy === `${row.key}::${row.holder}`"
                    @click="release(row.key, row.holder)"
                  >Release</Button>
                </span>
              </div>
            </div>
            <EmptyState v-else title="No active leases" description="Semaphore leases appear here while they are held." />
          </div>

          <PanelSection v-else>
            <p class="locks-loading">Loading…</p>
          </PanelSection>
        </Panel>
      </section>
    </div>
  </div>
</template>

<style scoped>
.ltable { display: flex; flex-direction: column; }
.ltable__head,
.ltable__row { display: flex; align-items: center; }
.ltable__head {
  border-bottom: 1px solid var(--ink-08);
}
.ltable__head .ltable__col {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 500;
  color: var(--ink-60);
  padding: 12px 18px;
}
.ltable__row {
  border-bottom: 1px solid var(--ink-08);
}
.ltable__row:last-child { border-bottom: 0; }
.ltable__col { padding: 14px 18px; font-size: 14px; }
.ltable__col--key {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.16px;
}
.ltable__col--holder {
  flex: 0 0 220px;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink-60);
}
.ltable__col--ttl {
  flex: 0 0 130px;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: var(--ink-60);
}
.ltable__col--action {
  flex: 0 0 120px;
  display: flex;
  justify-content: flex-end;
}
.locks-loading {
  margin: 0;
  font-size: 13px;
  color: var(--ink-40);
}
</style>
