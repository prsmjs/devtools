<script setup>
import { ref } from "vue"
import Scrubber from "../components/Scrubber.vue"
import Field from "../components/Field.vue"

const x = ref(120)
const opacity = ref(80)
const angle = ref(0)
const conf = ref(0.85)
</script>

<template>
  <Story title="Scrubber">
    <Variant title="Basic">
      <Field label="X position" hint="Drag left/right on the field, or click to type">
        <Scrubber v-model="x" />
      </Field>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">Value: <code>{{ x }}</code></p>
    </Variant>

    <Variant title="With label + suffix">
      <div style="display: flex; gap: 12px;">
        <Scrubber v-model="opacity" label="Opacity" suffix="%" :min="0" :max="100" />
        <Scrubber v-model="angle" label="Angle" suffix="°" :min="-180" :max="180" />
      </div>
    </Variant>

    <Variant title="Precision + sensitivity">
      <Field label="Confidence" hint="step 0.01, two decimals, 10px per step">
        <Scrubber
          v-model="conf"
          :min="0"
          :max="1"
          :step="0.01"
          :precision="2"
          :sensitivity="10"
        />
      </Field>
    </Variant>

    <Variant title="Sizes + states">
      <div style="display: flex; gap: 12px; align-items: center;">
        <Scrubber :modelValue="50" size="sm" />
        <Scrubber :modelValue="50" size="md" />
        <Scrubber :modelValue="50" size="lg" />
        <Scrubber :modelValue="50" disabled />
      </div>
    </Variant>
  </Story>
</template>
