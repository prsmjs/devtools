<script setup>
import { ref } from "vue"
import ToggleGroup from "../components/ToggleGroup.vue"
import Field from "../components/Field.vue"

const align = ref("left")
const view = ref("table")
const days = ref(["mon", "wed", "fri"])
const formats = ref([])
</script>

<template>
  <Story title="ToggleGroup">
    <Variant title="Single select">
      <Field label="Text align">
        <ToggleGroup
          v-model="align"
          :options="[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
            { value: 'justify', label: 'Justify' },
          ]"
        />
      </Field>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">Value: <code>{{ align }}</code></p>
    </Variant>

    <Variant title="With icons">
      <ToggleGroup
        v-model="view"
        :options="[
          { value: 'table', label: 'Table', icon: '▤' },
          { value: 'board', label: 'Board', icon: '▥' },
          { value: 'list', label: 'List', icon: '☰' },
        ]"
      />
    </Variant>

    <Variant title="Multiple select">
      <Field label="Active days">
        <ToggleGroup
          v-model="days"
          multiple
          :options="[
            { value: 'mon', label: 'Mon' },
            { value: 'tue', label: 'Tue' },
            { value: 'wed', label: 'Wed' },
            { value: 'thu', label: 'Thu' },
            { value: 'fri', label: 'Fri' },
          ]"
        />
      </Field>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">Selected: <code>{{ days.join(", ") || "none" }}</code></p>
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
        <ToggleGroup v-model="formats" multiple size="sm" :options="['B', 'I', 'U']" />
        <ToggleGroup v-model="formats" multiple size="md" :options="['B', 'I', 'U']" />
        <ToggleGroup v-model="formats" multiple size="lg" :options="['B', 'I', 'U']" />
      </div>
    </Variant>
  </Story>
</template>
