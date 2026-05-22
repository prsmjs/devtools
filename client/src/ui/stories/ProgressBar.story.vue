<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"
import ProgressBar from "../components/ProgressBar.vue"

// a value that climbs on its own so the story shows live motion
const live = ref(12)
let timer = null
onMounted(() => {
  timer = setInterval(() => {
    live.value = live.value >= 100 ? 0 : live.value + 4
  }, 600)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <Story title="ProgressBar">
    <Variant title="Continuous">
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 420px;">
        <ProgressBar :value="25" />
        <ProgressBar :value="60" />
        <ProgressBar :value="92" />
      </div>
    </Variant>

    <Variant title="Segmented">
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 420px;">
        <ProgressBar :value="40" :segments="10" label="Steps" show-value />
        <ProgressBar :value="live" :segments="12" label="Ingestion" show-value />
        <ProgressBar :value="80" :segments="5" variant="success" />
      </div>
    </Variant>

    <Variant title="With label + value">
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 420px;">
        <ProgressBar :value="live" label="Ingestion" show-value />
        <ProgressBar :value="42" label="Upload" show-value variant="success" />
      </div>
    </Variant>

    <Variant title="Color variants">
      <div style="display: flex; flex-direction: column; gap: 18px; max-width: 420px;">
        <ProgressBar :value="70" variant="default" />
        <ProgressBar :value="70" variant="lavender" />
        <ProgressBar :value="70" variant="success" />
        <ProgressBar :value="70" variant="warning" />
        <ProgressBar :value="70" variant="danger" />
      </div>
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; flex-direction: column; gap: 18px; max-width: 420px;">
        <ProgressBar :value="55" size="sm" />
        <ProgressBar :value="55" size="md" />
        <ProgressBar :value="55" size="lg" />
        <ProgressBar :value="55" :segments="10" size="sm" />
        <ProgressBar :value="55" :segments="10" size="lg" />
      </div>
    </Variant>

    <Variant title="Indeterminate">
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 420px;">
        <ProgressBar indeterminate label="Loading" />
        <ProgressBar indeterminate variant="success" size="lg" />
      </div>
    </Variant>
  </Story>
</template>
