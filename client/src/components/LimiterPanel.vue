<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import Input from '../ui/components/Input.vue'
import Button from '../ui/components/Button.vue'
import ScrollArea from '../ui/components/ScrollArea.vue'
import { toast } from '../ui/composables/toast.js'

const props = defineProps({ name: { type: String, required: true } })

const recentKeys = ref([])
const loaded = ref(false)
const lookupKey = ref('')
const lookupResult = ref(null)
const lookupError = ref(null)
const lookingUp = ref(false)
const busy = ref(null)

let pollTimer = null

async function loadKeys() {
  const res = await fetch(api(`/limits/${encodeURIComponent(props.name)}/keys`))
  if (res.ok) {
    const data = await res.json()
    recentKeys.value = data.keys
  }
  loaded.value = true
}

onMounted(() => {
  loadKeys()
  pollTimer = setInterval(loadKeys, 3000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

function formatState(s) {
  if (!s) return ''
  if (s.total !== undefined) return `${s.remaining} left · ${s.total} used`
  return `${s.remaining} left`
}

async function lookup() {
  const key = lookupKey.value.trim()
  if (!key) return
  lookingUp.value = true
  lookupError.value = null
  lookupResult.value = null
  try {
    const res = await fetch(
      api(`/limits/${encodeURIComponent(props.name)}/peek/${encodeURIComponent(key)}`),
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) lookupError.value = data.error || 'Peek failed.'
    else lookupResult.value = { key, ...data }
  } catch (err) {
    lookupError.value = err.message
  } finally {
    lookingUp.value = false
  }
}

async function resetKey(key) {
  busy.value = key
  try {
    const res = await fetch(
      api(`/limits/${encodeURIComponent(props.name)}/reset/${encodeURIComponent(key)}`),
      { method: 'POST' },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error('Reset failed', { description: data.error || 'The key could not be reset.' })
    } else {
      toast.success('Key reset', { description: `"${key}" cleared on "${props.name}".` })
      if (lookupResult.value?.key === key) await lookup()
    }
    await loadKeys()
  } catch (err) {
    toast.error('Reset failed', { description: err.message })
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <Panel>
    <template #header>
      <h3 class="lp-title">{{ name }}</h3>
    </template>

    <PanelSection label="Recent keys" flush>
      <ScrollArea v-if="recentKeys.length" max-height="280px">
        <div v-for="entry in recentKeys" :key="entry.key" class="lp-row">
          <span class="lp-row__key" :title="entry.key">{{ entry.key }}</span>
          <span class="lp-row__state">{{ formatState(entry) }}</span>
          <Button
            size="sm"
            variant="ghost"
            :loading="busy === entry.key"
            @click="resetKey(entry.key)"
          >Reset</Button>
        </div>
      </ScrollArea>
      <p v-else class="lp-empty">
        {{ loaded ? 'No keys touched yet.' : 'Loading…' }}
      </p>
    </PanelSection>

    <PanelSection label="Look up a key">
      <form class="lp-lookup" @submit.prevent="lookup">
        <Input v-model="lookupKey" placeholder="Exact key name" class="lp-lookup__input" />
        <Button type="submit" variant="primary" :loading="lookingUp" :disabled="!lookupKey.trim()">
          Peek
        </Button>
      </form>
      <div v-if="lookupResult" class="lp-result">
        <span class="lp-row__key">{{ lookupResult.key }}</span>
        <span class="lp-row__state">{{ formatState(lookupResult) }}</span>
        <Button
          size="sm"
          variant="ghost"
          :loading="busy === lookupResult.key"
          @click="resetKey(lookupResult.key)"
        >Reset</Button>
      </div>
      <p v-if="lookupError" class="lp-error">{{ lookupError }}</p>
    </PanelSection>
  </Panel>
</template>

<style scoped>
.lp-title {
  margin: 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.lp-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  border-top: 1px solid var(--ink-08);
}
.lp-row:first-child { border-top: 0; }
.lp-row__key {
  flex: 1;
  min-width: 0;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lp-row__state {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--ink-60);
  font-variant-numeric: tabular-nums;
}

.lp-empty {
  margin: 0;
  padding: 18px 24px;
  font-size: 13px;
  color: var(--ink-40);
}

.lp-lookup {
  display: flex;
  gap: 8px;
}
.lp-lookup__input { flex: 1; min-width: 0; }

.lp-result {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--ink-04);
  border-radius: var(--radius-comfy);
}
.lp-error {
  margin: 10px 0 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--status-failed);
}
</style>
