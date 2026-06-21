<script setup>
import { ref } from 'vue'
import { api } from '../../api.js'
import Panel from '../../ui/components/Panel.vue'
import PanelSection from '../../ui/components/PanelSection.vue'
import Badge from '../../ui/components/Badge.vue'
import ScrollArea from '../../ui/components/ScrollArea.vue'

const activity = ref([])
const loaded = ref(false)

async function load() {
  try {
    const res = await fetch(api('/auth/activity?limit=200'))
    if (res.ok) activity.value = (await res.json()).activity
  } catch {} finally {
    loaded.value = true
  }
}

load()

function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}
</script>

<template>
  <Panel>
    <template #header>
      <h3 class="title">Recent activity</h3>
    </template>
    <PanelSection flush>
      <ScrollArea max-height="560px">
        <div v-if="activity.length" class="feed">
          <div v-for="row in activity" :key="row.id" class="event">
            <div class="event__main">
              <Badge :variant="row.success ? 'active' : 'failed'" size="sm">{{ row.action }}</Badge>
              <code v-if="row.email" class="event__email">{{ row.email }}</code>
              <span v-if="row.actor_account_id" class="event__actor">via actor #{{ row.actor_account_id }}</span>
            </div>
            <div class="event__meta">
              <span>{{ fmtDate(row.created_at) }}</span>
              <template v-if="row.browser || row.os">
                <span class="event__dot" />
                <span>{{ [row.browser, row.os].filter(Boolean).join(' · ') }}</span>
              </template>
              <template v-if="row.ip_address">
                <span class="event__dot" />
                <span>{{ row.ip_address }}</span>
              </template>
            </div>
          </div>
        </div>
        <p v-else class="muted">{{ loaded ? 'No activity recorded.' : 'Loading…' }}</p>
      </ScrollArea>
    </PanelSection>
  </Panel>
</template>

<style scoped>
.title {
  margin: 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
}
.feed { display: flex; flex-direction: column; }
.event { padding: 11px 24px; border-top: 1px solid var(--ink-08); }
.event:first-child { border-top: 0; }
.event__main { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.event__email { font-family: var(--mono); font-size: 12.5px; color: var(--ink); }
.event__actor { font-size: 12px; color: var(--ink-40); }
.event__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-60);
}
.event__dot { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-20); }
.muted { font-size: 13px; color: var(--ink-60); margin: 0; padding: 16px 24px; }
</style>
