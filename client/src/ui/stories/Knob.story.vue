<script setup>
import { ref } from "vue"
import Knob from "../components/Knob.vue"

const volume = ref(60)
const gain = ref(0)
const temp = ref(42)
const mix = ref(50)
</script>

<template>
  <Story title="Knob">
    <Variant title="Basic">
      <Knob v-model="volume" label="Volume" :format-value="(v) => v + '%'" />
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">
        Drag up / down to change, or focus and use arrow keys.
      </p>
    </Variant>

    <Variant title="Bipolar range">
      <Knob v-model="gain" :min="-12" :max="12" label="Gain" :format-value="(v) => (v > 0 ? '+' : '') + v + ' dB'" />
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; gap: 28px; align-items: flex-start;">
        <Knob v-model="temp" :size="52" label="Small" />
        <Knob v-model="temp" :size="72" label="Medium" />
        <Knob v-model="temp" :size="104" label="Large" />
      </div>
    </Variant>

    <Variant title="A row of knobs">
      <div style="display: flex; gap: 24px;">
        <Knob v-model="volume" label="Volume" />
        <Knob v-model="mix" label="Mix" />
        <Knob v-model="gain" :min="-12" :max="12" label="Gain" />
        <Knob :modelValue="30" label="Locked" disabled />
      </div>
    </Variant>
  </Story>
</template>
