<script setup>
import { ref } from "vue"
import NumberInput from "../components/NumberInput.vue"
import Field from "../components/Field.vue"

const qty = ref(3)
const price = ref(1200)
const small = ref(5)
const med = ref(10)
const large = ref(15)
</script>

<template>
  <Story title="NumberInput">
    <Variant title="Basic">
      <Field label="Quantity">
        <NumberInput v-model="qty" :min="0" :max="99" />
      </Field>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">Value: <code>{{ qty }}</code></p>
    </Variant>

    <Variant title="Step + range">
      <Field label="Arrears (cents)" hint="Steps by 100, clamped 0 - 100000">
        <NumberInput v-model="price" :min="0" :max="100000" :step="100" />
      </Field>
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; gap: 12px; align-items: center;">
        <NumberInput v-model="small" size="sm" />
        <NumberInput v-model="med" size="md" />
        <NumberInput v-model="large" size="lg" />
      </div>
    </Variant>

    <Variant title="States">
      <div style="display: flex; gap: 12px; align-items: center;">
        <NumberInput :modelValue="7" invalid />
        <NumberInput :modelValue="7" disabled />
      </div>
    </Variant>
  </Story>
</template>
