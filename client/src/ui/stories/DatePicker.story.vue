<script setup>
import { ref } from "vue"
import DatePicker from "../components/DatePicker.vue"
import DateRangePicker from "../components/DateRangePicker.vue"
import Field from "../components/Field.vue"

const date = ref(new Date())
const filed = ref(null)
const range = ref({
  start: new Date(2026, 4, 1),
  end: new Date(2026, 4, 14),
})
const open = ref(null)
</script>

<template>
  <Story title="Date pickers">
    <Variant title="DatePicker">
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 320px; padding: 24px;">
        <Field label="Hearing date">
          <DatePicker v-model="date" />
        </Field>
        <Field label="Filed on" hint="Optional">
          <DatePicker v-model="filed" placeholder="Pick a date" />
        </Field>
        <div style="font-size: 13px; color: var(--ink-60);">
          Selected: <code>{{ date?.toISOString().slice(0, 10) || "-" }}</code>
        </div>
      </div>
    </Variant>

    <Variant title="DateRangePicker">
      <div style="padding: 24px; max-width: 480px;">
        <Field label="Filter cases by date">
          <DateRangePicker v-model="range" />
        </Field>
        <div style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">
          {{ range?.start?.toISOString().slice(0, 10) }} → {{ range?.end?.toISOString().slice(0, 10) }}
        </div>
      </div>
    </Variant>
  </Story>
</template>
