<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api.js'
import JsonView from '../components/JsonView.vue'
import PageHeader from '../ui/components/PageHeader.vue'
import Panel from '../ui/components/Panel.vue'
import PanelSection from '../ui/components/PanelSection.vue'
import Badge from '../ui/components/Badge.vue'
import Input from '../ui/components/Input.vue'
import Select from '../ui/components/Select.vue'
import Button from '../ui/components/Button.vue'
import Callout from '../ui/components/Callout.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import { toast } from '../ui/composables/toast.js'

const limiters = ref([])
const peekName = ref('')
const peekKey = ref('')
const peekResult = ref(null)
const peekError = ref(null)
const resetting = ref(false)

onMounted(async () => {
  const res = await fetch(api('/limits'))
  if (res.ok) {
    const data = await res.json()
    limiters.value = data.limiters
    if (data.limiters.length) peekName.value = data.limiters[0]
  }
})

async function peek() {
  if (!peekName.value || !peekKey.value) return
  peekError.value = null
  peekResult.value = null

  const res = await fetch(api(`/limits/${peekName.value}/peek/${encodeURIComponent(peekKey.value)}`))
  if (res.ok) {
    peekResult.value = await res.json()
  } else {
    const data = await res.json()
    peekError.value = data.error
  }
}

async function resetKey() {
  if (!peekName.value || !peekKey.value) return
  resetting.value = true
  try {
    const res = await fetch(
      api(`/limits/${peekName.value}/reset/${encodeURIComponent(peekKey.value)}`),
      { method: 'POST' },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error('Reset failed', { description: data.error || 'The key could not be reset.' })
    } else {
      toast.success('Key reset', { description: `"${peekKey.value}" cleared on limiter "${peekName.value}".` })
      await peek()
    }
  } catch (err) {
    toast.error('Reset failed', { description: err.message })
  } finally {
    resetting.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Rate limiting"
      title="Limits"
      subtitle="Registered limiters, and a peek tool to inspect any key's current state without consuming it."
    />

    <div class="page-body">
      <section class="page-section">
        <Panel title="Registered limiters">
          <PanelSection>
            <div v-if="limiters.length" class="limiter-list">
              <Badge v-for="name in limiters" :key="name" variant="solid" size="md">{{ name }}</Badge>
            </div>
            <EmptyState v-else title="No limiters registered" description="Named limiters will appear here once registered." />
          </PanelSection>
        </Panel>
      </section>

      <section v-if="limiters.length" class="page-section">
        <Panel title="Peek" description="Inspect a key's remaining budget without consuming any of it.">
          <PanelSection>
            <form class="peek-form" @submit.prevent="peek">
              <Select v-model="peekName" :options="limiters" />
              <Input v-model="peekKey" placeholder="Key to inspect" class="peek-form__key" />
              <Button type="submit" variant="primary" :disabled="!peekKey">Peek</Button>
              <Button
                type="button"
                variant="danger"
                :disabled="!peekKey"
                :loading="resetting"
                loading-label="Resetting"
                @click="resetKey"
              >Reset</Button>
            </form>

            <div v-if="peekResult" class="peek-result">
              <JsonView :data="peekResult" />
            </div>
            <Callout v-if="peekError" variant="danger" title="Peek failed" class="peek-error">
              {{ peekError }}
            </Callout>
          </PanelSection>
        </Panel>
      </section>
    </div>
  </div>
</template>

<style scoped>
.limiter-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.peek-form {
  display: flex;
  gap: 10px;
  align-items: center;
}
.peek-form__key { flex: 1; min-width: 0; }

.peek-result {
  margin-top: 16px;
  padding: 16px;
  background: var(--ink-04);
  border-radius: var(--radius-comfy);
}
.peek-error { margin-top: 16px; }
</style>
