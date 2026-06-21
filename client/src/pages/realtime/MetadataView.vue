<template>
  <div v-if="detail" class="md">
    <header class="md-id">
      <div class="md-id__avatar" :style="avatarStyle">{{ avatarInitial }}</div>
      <div class="md-id__core">
        <div class="md-id__row">
          <h2 class="md-id__name">{{ displayName }}</h2>
          <span v-if="displaySublabel" class="md-id__role">{{ displaySublabel }}</span>
          <span class="md-id__dot" :class="{ 'md-id__dot--dead': !detail.alive }" :title="detail.alive ? 'alive' : 'unresponsive'"></span>
        </div>
        <div class="md-id__sub">
          <code class="md-id__hash" :title="detail.id">{{ detail.id }}</code>
        </div>
      </div>
      <dl class="md-id__stats">
        <div>
          <dt>Latency</dt>
          <dd>{{ detail.latency !== null ? `${detail.latency}ms` : '—' }}</dd>
        </div>
        <div>
          <dt>Locality</dt>
          <dd>{{ detail.local ? 'this instance' : 'remote' }}</dd>
        </div>
        <div v-if="detail.remoteAddress">
          <dt>Address</dt>
          <dd>{{ detail.remoteAddress }}</dd>
        </div>
      </dl>
    </header>

    <section class="md-grid">
      <div class="md-col">
        <div class="md-block">
          <div class="md-block__head">
            <h3>Rooms</h3>
            <span class="md-count">{{ detail.rooms?.length || 0 }}</span>
          </div>
          <ul v-if="detail.rooms?.length" class="md-rooms">
            <li v-for="room in detail.rooms" :key="room" class="md-room">
              <span class="md-room__name">{{ room }}</span>
              <div v-if="detail.presence?.[room]" class="md-room__presence">
                <span v-for="(v, k) in detail.presence[room]" :key="k" class="md-presence-pair">
                  <span class="md-presence-pair__k">{{ k }}</span>
                  <span class="md-presence-pair__v">{{ formatValue(v) }}</span>
                </span>
              </div>
              <span v-else class="md-room__empty">no presence broadcast</span>
            </li>
          </ul>
          <p v-else class="md-empty">Not in any rooms.</p>
        </div>

        <div class="md-block">
          <div class="md-block__head">
            <h3>Channels</h3>
            <span class="md-count">{{ detail.channels?.length || 0 }}</span>
          </div>
          <div v-if="detail.channels?.length" class="md-chips">
            <code v-for="ch in detail.channels" :key="ch" class="md-chip">{{ ch }}</code>
          </div>
          <p v-else class="md-empty">No channel subscriptions.</p>
        </div>
      </div>

      <div class="md-col">
        <div class="md-block">
          <div class="md-block__head">
            <h3>Records</h3>
            <span class="md-count">{{ detail.records?.length || 0 }}</span>
          </div>
          <ul v-if="detail.records?.length" class="md-records">
            <li v-for="rec in detail.records" :key="rec.id" class="md-record">
              <code class="md-record__id">{{ rec.id }}</code>
              <span class="md-record__mode" :class="`md-record__mode--${rec.mode}`">{{ rec.mode }}</span>
            </li>
          </ul>
          <p v-else class="md-empty">No record subscriptions.</p>
        </div>

        <div class="md-block">
          <div class="md-block__head">
            <h3>Collections</h3>
            <span class="md-count">{{ detail.collections?.length || 0 }}</span>
          </div>
          <ul v-if="detail.collections?.length" class="md-collections">
            <li v-for="col in detail.collections" :key="col.id" class="md-collection">
              <code class="md-collection__id">{{ col.id }}</code>
              <span class="md-collection__version">v{{ col.version }}</span>
            </li>
          </ul>
          <p v-else class="md-empty">No collection subscriptions.</p>
        </div>
      </div>
    </section>

    <details v-if="hasMetadata" class="md-raw" open>
      <summary>Raw connection metadata</summary>
      <div class="md-raw__body">
        <JsonView :data="detail.metadata" />
      </div>
    </details>
  </div>

  <div v-else-if="connections.length" class="md-list">
    <p class="rt-hint">Select a connection on the left to see what it has joined and subscribed to.</p>
    <button
      v-for="conn in connections"
      :key="conn.id"
      type="button"
      class="md-list__row"
      @click="$emit('navigate', conn.id)"
    >
      <span class="md-list__avatar" :style="avatarStyleFor(conn)">{{ avatarInitialFor(conn) }}</span>
      <span class="md-list__core">
        <span class="md-list__name">{{ displayNameFor(conn) }}</span>
        <code class="md-list__id">{{ conn.id.slice(0, 8) }}</code>
      </span>
      <span v-if="conn.latency !== null" class="md-list__latency">{{ conn.latency }}ms</span>
      <span class="md-list__dot" :class="{ 'md-list__dot--dead': !conn.alive }" :title="conn.alive ? 'alive' : 'unresponsive'"></span>
    </button>
  </div>

  <EmptyState v-else title="No connections" description="Connected clients will appear here." />
</template>

<script setup>
import { computed } from 'vue'
import JsonView from '../../components/JsonView.vue'
import { EmptyState } from 'pastel-vue'

const props = defineProps({
  detail: { type: Object, default: null },
  connections: { type: Array, default: () => [] },
})

defineEmits(['navigate'])

function hashColor(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  return `hsl(${hue} 50% 78%)`
}

function avatarStyleFor(conn) {
  const seed = conn?.label ?? conn?.id ?? ''
  return { background: hashColor(seed) }
}

function avatarInitialFor(conn) {
  if (conn?.label) return conn.label.charAt(0).toUpperCase()
  return conn?.id ? conn.id.charAt(0).toUpperCase() : '?'
}

function displayNameFor(conn) {
  return conn?.label ?? `conn ${conn?.id?.slice(0, 8) ?? '????'}`
}

const displayName = computed(() => displayNameFor(props.detail))
const displaySublabel = computed(() => props.detail?.sublabel ?? null)
const avatarStyle = computed(() => avatarStyleFor(props.detail))
const avatarInitial = computed(() => avatarInitialFor(props.detail))
const hasMetadata = computed(() => props.detail?.metadata && Object.keys(props.detail.metadata).length > 0)

function formatValue(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
</script>

<style scoped>
.md { display: flex; flex-direction: column; gap: 20px; }

.md-id {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
  background: var(--ink-02, var(--ink-04));
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
}
.md-id__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #222;
}
.md-id__core { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.md-id__row { display: flex; align-items: center; gap: 10px; }
.md-id__name { margin: 0; font-size: 18px; letter-spacing: -0.2px; color: var(--ink); }
.md-id__role {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-sharp);
  background: var(--ink-08);
  color: var(--ink-60);
}
.md-id__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-active);
}
.md-id__dot--dead { background: var(--status-failed); }
.md-id__sub { display: flex; align-items: center; gap: 8px; }
.md-id__hash {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.md-id__stats {
  display: flex;
  gap: 22px;
  margin: 0;
}
.md-id__stats div { display: flex; flex-direction: column; gap: 2px; }
.md-id__stats dt {
  font-family: var(--mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-40);
}
.md-id__stats dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink);
}

.md-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
@media (max-width: 880px) { .md-grid { grid-template-columns: 1fr; } }

.md-col { display: flex; flex-direction: column; gap: 16px; }

.md-block {
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background: var(--paper, #fff);
}
.md-block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid var(--ink-08);
}
.md-block__head h3 {
  margin: 0;
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--ink-60);
}
.md-count {
  font-family: var(--mono);
  font-size: 18px;
  letter-spacing: -0.5px;
  color: var(--ink);
}

.md-rooms { list-style: none; margin: 0; padding: 0; }
.md-room {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 16px;
  border-top: 1px solid var(--ink-04);
}
.md-room:first-child { border-top: 0; }
.md-room__name {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink);
}
.md-room__presence { display: flex; flex-wrap: wrap; gap: 6px; }
.md-presence-pair {
  display: inline-flex;
  align-items: stretch;
  font-family: var(--mono);
  font-size: 11px;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  overflow: hidden;
}
.md-presence-pair__k {
  padding: 2px 6px;
  background: var(--ink-04);
  color: var(--ink-60);
}
.md-presence-pair__v {
  padding: 2px 6px;
  color: var(--ink);
}
.md-room__empty {
  font-size: 11px;
  color: var(--ink-40);
  font-style: italic;
}

.md-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 16px; }
.md-chip {
  font-family: var(--mono);
  font-size: 11px;
  padding: 3px 8px;
  background: var(--ink-04);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  color: var(--ink);
}

.md-records, .md-collections { list-style: none; margin: 0; padding: 0; }
.md-record, .md-collection {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 16px;
  border-top: 1px solid var(--ink-04);
}
.md-record:first-child, .md-collection:first-child { border-top: 0; }
.md-record__id, .md-collection__id { font-family: var(--mono); font-size: 12px; color: var(--ink); }
.md-record__mode {
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: var(--radius-sharp);
  background: var(--ink-08);
  color: var(--ink-60);
}
.md-record__mode--full { background: var(--ink); color: var(--paper-on-dark, #fff); }
.md-collection__version { font-family: var(--mono); font-size: 11px; color: var(--ink-40); }

.md-empty {
  margin: 0;
  padding: 16px;
  font-size: 12px;
  color: var(--ink-40);
  font-style: italic;
}

.md-raw {
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  padding: 0 14px;
}
.md-raw summary {
  padding: 10px 0;
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--ink-40);
  cursor: pointer;
}
.md-raw[open] summary { border-bottom: 1px solid var(--ink-08); margin-bottom: 10px; }
.md-raw__body { padding-bottom: 14px; }

.md-list { display: flex; flex-direction: column; gap: 8px; }
.rt-hint {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--ink-60);
}
.md-list__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  text-align: left;
  background: var(--paper, #fff);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.md-list__row:hover { background: var(--ink-02, var(--ink-04)); border-color: var(--ink-20); }
.md-list__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #222;
}
.md-list__core { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.md-list__name { font-size: 13px; color: var(--ink); }
.md-list__id { font-family: var(--mono); font-size: 11px; color: var(--ink-40); }
.md-list__latency { font-family: var(--mono); font-size: 11px; color: var(--ink-40); }
.md-list__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-active);
}
.md-list__dot--dead { background: var(--status-failed); }
</style>
