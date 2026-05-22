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
    return '<span class="json-view__null">null</span>'
  }
  return highlight(props.data)
})
</script>

<style scoped>
.json-view {
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.6;
}
.text-view {
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
.json-view__null { color: var(--ink-40); }
</style>
