<template>
  <component
    :is="interactive ? 'button' : 'span'"
    :type="interactive ? 'button' : undefined"
    class="cc"
    :class="{ 'cc--interactive': interactive }"
    :title="conn?.id ?? connectionId"
    @click="interactive ? $emit('navigate', conn?.id ?? connectionId) : null"
  >
    <span v-if="label" class="cc__label">{{ label }}</span>
    <span v-if="sublabel" class="cc__sublabel">{{ sublabel }}</span>
    <code class="cc__id" :class="{ 'cc__id--solo': !label }">{{ shortId }}</code>
  </component>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  connectionId: { type: String, required: true },
  connections: { type: Array, default: () => [] },
  interactive: { type: Boolean, default: false },
  showSublabel: { type: Boolean, default: false },
})

defineEmits(['navigate'])

const conn = computed(() => props.connections.find((c) => c.id === props.connectionId) ?? null)
const label = computed(() => conn.value?.label ?? null)
const sublabel = computed(() => (props.showSublabel ? conn.value?.sublabel ?? null : null))
const shortId = computed(() => props.connectionId.slice(0, 8))
</script>

<style scoped>
.cc {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 0;
  background: transparent;
  border: 0;
  text-align: left;
  font: inherit;
  color: inherit;
}
.cc--interactive {
  cursor: pointer;
  transition: color 120ms ease;
}
.cc--interactive:hover { color: var(--accent); }
.cc__label {
  font-size: 13px;
  color: var(--ink);
}
.cc__sublabel {
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: var(--radius-sharp);
  background: var(--ink-08);
  color: var(--ink-60);
}
.cc__id {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
}
.cc__id--solo {
  font-size: 12px;
  color: var(--ink);
}
</style>
