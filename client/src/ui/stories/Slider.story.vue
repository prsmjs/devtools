<script setup>
import { ref } from "vue"
import Slider from "../components/Slider.vue"
import NumberInput from "../components/NumberInput.vue"
import Field from "../components/Field.vue"

const temp = ref(42)
const volume = ref(70)
const priceRange = ref([20, 80])
const quality = ref(2)
const paired = ref(40)
</script>

<template>
  <Story title="Slider">
    <Variant title="Single value">
      <div style="max-width: 480px; display: flex; flex-direction: column; gap: 16px;">
        <Field label="Temperature">
          <Slider v-model="temp" :min="0" :max="100" show-value :format-value="(v) => `${v}°`" />
        </Field>
        <Field label="Volume">
          <Slider v-model="volume" :min="0" :max="100" show-value :format-value="(v) => `${v}%`" />
        </Field>
      </div>
    </Variant>

    <Variant title="Value bubble">
      <div style="max-width: 480px; padding-top: 12px;">
        <Field label="Volume" hint="Hover or drag the thumb">
          <Slider v-model="volume" :min="0" :max="100" tooltip :format-value="(v) => `${v}%`" />
        </Field>
      </div>
    </Variant>

    <Variant title="Tick marks + labels">
      <div style="max-width: 480px;">
        <Field label="Quality">
          <Slider
            v-model="quality"
            :min="0"
            :max="4"
            :step="1"
            tooltip
            :marks="[
              { value: 0, label: 'Draft' },
              { value: 1, label: 'Low' },
              { value: 2, label: 'Std' },
              { value: 3, label: 'High' },
              { value: 4, label: 'Max' },
            ]"
          />
        </Field>
      </div>
    </Variant>

    <Variant title="Range">
      <div style="max-width: 480px;">
        <Field label="Price range">
          <Slider
            v-model="priceRange"
            :min="0"
            :max="500"
            :step="10"
            show-value
            tooltip
            :marks="[0, 100, 200, 300, 400, 500]"
            :format-value="(v) => `$${v}`"
          />
        </Field>
      </div>
    </Variant>

    <Variant title="Paired with NumberInput">
      <div style="max-width: 480px; display: flex; align-items: center; gap: 16px;">
        <Slider v-model="paired" :min="0" :max="100" style="flex: 1;" />
        <NumberInput v-model="paired" :min="0" :max="100" size="sm" />
      </div>
    </Variant>

    <Variant title="Disabled">
      <div style="max-width: 480px;">
        <Slider :modelValue="30" disabled show-value />
      </div>
    </Variant>
  </Story>
</template>
