<template>
  <EmptyState
    v-if="!channelEntries.length"
    title="No channels"
    description="Channels with active subscribers or recent traffic will appear here."
  />
  <div v-else class="irc">
    <aside class="irc-list">
      <header class="irc-pane-head">
        <h3 class="irc-pane-title">Channels</h3>
        <Badge size="sm">{{ channelEntries.length }}</Badge>
      </header>
      <ScrollArea class="irc-scroll">
        <div class="irc-list__list">
          <button
            v-for="[name, info] in channelEntries"
            :key="name"
            class="irc-chan"
            :class="{ 'irc-chan--active': name === selected }"
            @click="selected = name"
          >
            <span class="irc-chan__dot" :class="{ 'irc-chan__dot--live': info.subscribers.length }" />
            <span class="irc-chan__name">{{ name }}</span>
            <span class="irc-chan__count">{{ info.subscribers.length }}</span>
          </button>
        </div>
      </ScrollArea>
    </aside>

    <section class="irc-main">
      <header class="irc-pane-head">
        <h3 class="irc-pane-title irc-pane-title--channel">{{ selected }}</h3>
        <Badge v-if="selectedMessages.length" size="sm">
          {{ selectedMessages.length }} {{ selectedMessages.length === 1 ? 'message' : 'messages' }}
        </Badge>
      </header>
      <ScrollArea class="irc-scroll">
        <TransitionGroup v-if="selectedMessages.length" :key="selected" name="ch-msg" tag="div" class="ch-stream">
          <div v-for="msg in selectedMessages" :key="msg.seq" class="ch-msg">
            <div class="ch-msg__meta">
              <span class="ch-msg__time">{{ formatTime(msg.timestamp) }}</span>
              <span v-if="multiInstance && msg.instanceId" class="ch-msg__origin" :title="msg.instanceId">{{ msg.instanceId.slice(0, 6) }}</span>
            </div>
            <div class="ch-msg__body">
              <JsonView :data="msg.payload" />
            </div>
          </div>
        </TransitionGroup>
        <p v-else class="irc-empty">No messages observed on this channel yet.</p>
      </ScrollArea>
    </section>

    <aside class="irc-members">
      <header class="irc-pane-head">
        <h3 class="irc-pane-title">Subscribers</h3>
        <Badge size="sm" :variant="selectedSubscribers.length ? 'active' : 'default'">{{ selectedSubscribers.length }}</Badge>
      </header>
      <ScrollArea class="irc-scroll">
        <div v-if="selectedSubscribers.length" class="irc-members__list">
          <button
            v-for="connId in selectedSubscribers"
            :key="connId"
            type="button"
            class="irc-member"
            :class="{ 'irc-member--active': connId === selectedConnectionId }"
            :title="connId === selectedConnectionId ? 'Clear connection filter' : 'Show only channels this connection is in'"
            @click="$emit('select-connection', connId === selectedConnectionId ? null : connId)"
          >
            <ConnectionChip
              :connection-id="connId"
              :connections="connections"
              show-sublabel
            />
          </button>
        </div>
        <p v-else class="irc-empty">No active subscribers.</p>
      </ScrollArea>
    </aside>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Badge, EmptyState, ScrollArea } from 'pastel-vue'
import ConnectionChip from '../../components/ConnectionChip.vue'
import JsonView from '../../components/JsonView.vue'

const props = defineProps({
  channels: { type: Object, default: () => ({}) },
  channelMessages: { type: Object, default: () => ({}) },
  connections: { type: Array, default: () => [] },
  selectedConnectionId: { type: String, default: null },
})

defineEmits(['navigate', 'select-connection'])

const channelEntries = computed(() => Object.entries(props.channels))
const selected = ref(null)

watch(
  channelEntries,
  (entries) => {
    if (!entries.length) { selected.value = null; return }
    if (!selected.value || !props.channels[selected.value]) {
      selected.value = entries[0][0]
    }
  },
  { immediate: true },
)

const selectedMessages = computed(() => {
  if (!selected.value) return []
  return (props.channelMessages[selected.value] ?? []).slice().reverse()
})

const selectedSubscribers = computed(() => {
  if (!selected.value) return []
  return props.channels[selected.value]?.subscribers ?? []
})

const multiInstance = computed(() => {
  const ids = new Set()
  for (const buf of Object.values(props.channelMessages)) {
    for (const m of buf) {
      if (m.instanceId) ids.add(m.instanceId)
      if (ids.size > 1) return true
    }
  }
  return false
})

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour12: false })
}
</script>

<style scoped>
.irc {
  display: grid;
  grid-template-columns: 204px minmax(0, 1fr) 220px;
  height: clamp(440px, 70vh, 820px);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  overflow: hidden;
  background: var(--paper, #fff);
}

.irc-list,
.irc-main,
.irc-members {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.irc-list { border-right: 1px solid var(--ink-08); }
.irc-members { border-left: 1px solid var(--ink-08); }

.irc-pane-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--ink-08);
  background: var(--ink-02, var(--ink-04));
}
.irc-pane-title {
  margin: 0;
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-60);
}
.irc-pane-title--channel {
  text-transform: none;
  letter-spacing: 0.02em;
  font-size: 13px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.irc-scroll { flex: 1 1 auto; min-height: 0; }
.irc-scroll :deep(.pc-scrollarea__viewport) { height: 100%; }

.irc-list__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}
.irc-chan {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-sharp);
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--ink);
  transition: background 120ms ease;
}
.irc-chan:hover:not(.irc-chan--active) { background: var(--ink-04); }
.irc-chan--active { background: var(--ink-08); }
.irc-chan__dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink-20);
}
.irc-chan__dot--live { background: var(--status-active); }
.irc-chan__name {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--mono);
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.irc-chan__count {
  flex: none;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
}

.ch-stream {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}
.ch-msg {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 8px 10px;
  background: var(--ink-04);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
}
.ch-msg__meta { display: flex; flex-direction: column; gap: 3px; }
.ch-msg__time {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-60);
}
.ch-msg__origin {
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--ink-40);
}
.ch-msg__body { min-width: 0; overflow-x: auto; }

.irc-members__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}
.irc-member {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-sharp);
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--ink);
  transition: background 120ms ease;
}
.irc-member:hover:not(.irc-member--active) { background: var(--ink-04); }
.irc-member--active { background: var(--ink-08); }

.irc-empty {
  margin: 0;
  padding: 16px;
  font-size: 12.5px;
  color: var(--ink-40);
}

.ch-msg-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.ch-msg-enter-active {
  transition: opacity 240ms ease, transform 240ms ease;
}
.ch-msg-move {
  transition: transform 240ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .ch-msg-enter-active,
  .ch-msg-move { transition: none; }
}

@media (max-width: 940px) {
  .irc {
    grid-template-columns: 1fr;
    height: auto;
  }
  .irc-list,
  .irc-members {
    border-left: 0;
    border-right: 0;
    border-top: 1px solid var(--ink-08);
  }
  .irc-scroll { flex: none; }
  .irc-scroll :deep(.pc-scrollarea__viewport) { height: auto; max-height: 320px; }
}
</style>
