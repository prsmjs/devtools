<template>
  <pre v-if="isString" class="text-view">{{ props.data }}</pre>
  <div v-else class="json-view" v-html="html"></div>
</template>

<script setup>
import { computed } from 'vue'
import { useHighlight } from '../composables/useHighlight.js'

const props = defineProps({ data: { default: null } })
const { highlight } = useHighlight()

const isString = computed(() => typeof props.data === 'string')

const html = computed(() => {
  if (props.data === null || props.data === undefined) {
    return '<span style="color: var(--syn-null)">null</span>'
  }
  return highlight(props.data)
})
</script>

<style scoped>
.text-view {
  font: 12px 'SF Mono', monospace;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
</style>
