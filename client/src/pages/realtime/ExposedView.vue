<template>
  <EmptyState
    v-if="!sections.length"
    title="Nothing exposed"
    description="The server hasn't exposed any channels, records, collections, presence rooms, or commands yet."
  />
  <div v-else class="exposed">
    <p class="exposed__hint">
      Patterns the server has opted in to. Clients can only subscribe to or invoke things that match a pattern here.
    </p>
    <div class="exposed__grid">
      <Panel
        v-for="section in sections"
        :key="section.key"
      >
        <template #header>
          <div class="exposed__head">
            <h3 class="exposed__title">{{ section.label }}</h3>
            <Badge size="sm">{{ section.items.length }}</Badge>
          </div>
        </template>
        <PanelSection flush>
          <p class="exposed__desc">{{ section.description }}</p>
          <div class="exposed__items">
            <code
              v-for="item in section.items"
              :key="item"
              class="exposed__item"
            >{{ formatItem(item) }}</code>
          </div>
        </PanelSection>
      </Panel>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Panel, PanelSection, Badge, EmptyState } from 'pastel-vue'

const props = defineProps({
  exposed: { type: Object, default: () => ({}) },
})

const META = {
  channels: { label: 'Channels', description: 'Pub/sub topics clients can subscribe to.' },
  records: { label: 'Records', description: 'Versioned documents clients can read.' },
  writableRecords: { label: 'Writable records', description: 'Records clients are allowed to write.' },
  collections: { label: 'Collections', description: 'Indexes over records resolved per-connection.' },
  presence: { label: 'Presence rooms', description: 'Rooms where presence states are tracked.' },
  commands: { label: 'Commands', description: 'RPC-style operations clients can invoke.' },
}

const sections = computed(() => {
  const out = []
  for (const key of Object.keys(META)) {
    const items = props.exposed?.[key] ?? []
    if (!items.length) continue
    out.push({ key, ...META[key], items })
  }
  return out
})

function formatItem(item) {
  if (typeof item !== 'string') return String(item)
  const match = item.match(/^\/\^(.+?)\$\/$/)
  if (match) return match[1]
  return item
}
</script>

<style scoped>
.exposed { display: flex; flex-direction: column; gap: 16px; }
.exposed__hint {
  margin: 0;
  font-size: 13px;
  color: var(--ink-60);
}
.exposed__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-items: start;
}
.exposed__head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.exposed__title {
  margin: 0;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
}
.exposed__desc {
  margin: 14px 24px 12px;
  font-size: 12.5px;
  color: var(--ink-60);
  line-height: 1.45;
}
.exposed__items {
  padding: 0 24px 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.exposed__item {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink);
  padding: 4px 8px;
  background: var(--ink-04);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
}
</style>
