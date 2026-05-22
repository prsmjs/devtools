<script setup>
import { ref } from "vue"
import Rating from "../components/Rating.vue"
import Field from "../components/Field.vue"

const score = ref(3)
const half = ref(3.5)
const big = ref(4)
</script>

<template>
  <Story title="Rating">
    <Variant title="Basic">
      <Field label="Quality">
        <Rating v-model="score" />
      </Field>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">Value: <code>{{ score }}</code></p>
    </Variant>

    <Variant title="Half steps">
      <Field label="Score" hint="Hover the left/right half of a star">
        <Rating v-model="half" allow-half />
      </Field>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">Value: <code>{{ half }}</code></p>
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <Rating v-model="big" size="sm" />
        <Rating v-model="big" size="md" />
        <Rating v-model="big" size="lg" />
      </div>
    </Variant>

    <Variant title="Readonly + ten stars">
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <Rating :modelValue="4" readonly />
        <Rating :modelValue="7.5" :max="10" allow-half readonly />
        <Rating :modelValue="2" disabled />
      </div>
    </Variant>
  </Story>
</template>
