<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import Badge from '../ui/components/Badge.vue'
import Button from '../ui/components/Button.vue'
import ScrollArea from '../ui/components/ScrollArea.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import { toast } from '../ui/composables/toast.js'

const managers = ref([])
const loaded = ref(false)
const busy = ref(null)

let pollTimer = null

async function poll() {
  const res = await fetch(api('/locks'))
  if (res.ok) {
    const data = await res.json()
    managers.value = data.managers
  }
  loaded.value = true
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
  return id?.length > 14 ? `${id.slice(0, 14)}…` : id
}

async function release(managerName, key, id) {
  busy.value = `${managerName}::${key}::${id}`
  try {
    const res = await fetch(api(`/locks/${encodeURIComponent(managerName)}/release`), {
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
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Coordination"
      title="Locks"
      subtitle="Held mutexes and semaphore leases across every lock manager - who holds what, and for how long."
    />

    <div class="page-body">
      <EmptyState
        v-if="loaded && !managers.length"
        title="No lock managers"
        description="Mutex and semaphore managers passed to devtools will appear here."
      />

      <div v-else class="lock-grid">
        <Panel v-for="m in managers" :key="m.name">
          <template #header>
            <h3 class="lock-panel__title">{{ m.name }}</h3>
          </template>
          <template #aside>
            <Badge :variant="m.kind === 'semaphore' ? 'paused' : 'default'" size="sm">{{ m.kind }}</Badge>
          </template>

          <PanelSection v-if="m.error" label="Error">
            <p class="lock-error">{{ m.error }}</p>
          </PanelSection>

          <!-- mutex -->
          <PanelSection v-else-if="m.kind === 'mutex'" flush>
            <ScrollArea v-if="m.locks.length" max-height="340px">
              <div
                v-for="l in m.locks"
                :key="l.key"
                class="lock-item"
              >
                <div class="lock-item__top">
                  <span class="lock-item__key">{{ l.key }}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    :loading="busy === `${m.name}::${l.key}::${l.holder}`"
                    @click="release(m.name, l.key, l.holder)"
                  >Release</Button>
                </div>
                <div class="lock-item__meta">
                  <span>{{ l.holder }}</span>
                  <span class="lock-item__dot" />
                  <span>expires in {{ formatTtl(l.ttl) }}</span>
                </div>
              </div>
            </ScrollArea>
            <p v-else class="lock-empty">No locks held.</p>
          </PanelSection>

          <!-- semaphore -->
          <PanelSection v-else flush>
            <ScrollArea v-if="m.locks.length" max-height="340px">
              <div v-for="sem in m.locks" :key="sem.key" class="sem-block">
                <div class="sem-block__head">
                  <span class="sem-block__key">{{ sem.key }}</span>
                  <Badge size="sm">{{ sem.active }} / {{ sem.max }}</Badge>
                </div>
                <div
                  v-for="holder in sem.holders"
                  :key="holder"
                  class="lock-item lock-item--lease"
                >
                  <span class="lock-item__key lock-item__key--mono" :title="holder">{{ shortId(holder) }}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    :loading="busy === `${m.name}::${sem.key}::${holder}`"
                    @click="release(m.name, sem.key, holder)"
                  >Release</Button>
                </div>
              </div>
            </ScrollArea>
            <p v-else class="lock-empty">No active leases.</p>
          </PanelSection>
        </Panel>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
  align-items: start;
}

.lock-panel__title {
  margin: 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.lock-item {
  padding: 12px 24px;
  border-top: 1px solid var(--ink-08);
}
.lock-item:first-child { border-top: 0; }
.lock-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.lock-item__key {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.16px;
  color: var(--ink);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lock-item__key--mono { font-family: var(--mono); font-size: 12.5px; font-weight: 400; }
.lock-item__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-60);
}
.lock-item__dot { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-20); }

/* semaphore lease rows sit under a per-key header */
.lock-item--lease {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 24px 9px 36px;
  border-top: 1px solid var(--ink-08);
}
.sem-block { border-top: 1px solid var(--ink-08); }
.sem-block:first-child { border-top: 0; }
.sem-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  background: var(--ink-04);
}
.sem-block__key {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
}

.lock-empty {
  margin: 0;
  padding: 20px 24px;
  font-size: 13px;
  color: var(--ink-40);
}
.lock-error {
  margin: 0;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--status-failed);
}
</style>
