<script setup>
import { ref } from "vue"
import MultiSelect from "../components/MultiSelect.vue"
import Field from "../components/Field.vue"
import Badge from "../components/Badge.vue"
import Button from "../components/Button.vue"

const tags = ref(["pending", "active"])
const jurisdictions = ref([])
const colorPicked = ref(["lavender"])

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "failed", label: "Failed" },
]

const jurisdictionOptions = [
  { value: "denver", label: "Denver County" },
  { value: "arapahoe", label: "Arapahoe County" },
  { value: "jefferson", label: "Jefferson County" },
  { value: "boulder", label: "Boulder County" },
  { value: "adams", label: "Adams County" },
  { value: "douglas", label: "Douglas County" },
  { value: "el-paso", label: "El Paso County" },
  { value: "weld", label: "Weld County" },
  { value: "larimer", label: "Larimer County" },
  { value: "mesa", label: "Mesa County" },
]

const colorOptions = [
  { value: "lavender", label: "Lavender", hex: "#bdbbff" },
  { value: "pink", label: "Pink", hex: "#ffd6f5" },
  { value: "blue", label: "Blue", hex: "#d6e1ff" },
  { value: "peach", label: "Peach", hex: "#ffd6a8" },
  { value: "midnight", label: "Midnight", hex: "#010120" },
]
</script>

<template>
  <Story title="MultiSelect">
    <Variant title="Basic">
      <div style="max-width: 320px;">
        <Field label="Status">
          <MultiSelect v-model="tags" :options="statusOptions" placeholder="Any status" />
        </Field>
      </div>
    </Variant>

    <Variant title="Searchable">
      <div style="max-width: 320px;">
        <Field label="Jurisdictions" hint="Pick one or more counties">
          <MultiSelect
            v-model="jurisdictions"
            :options="jurisdictionOptions"
            placeholder="All jurisdictions"
            searchable
            search-placeholder="Search counties..."
          />
        </Field>
      </div>
    </Variant>

    <Variant title="Render prop (scoped slot)">
      <div style="max-width: 320px;">
        <Field label="Brand color">
          <MultiSelect
            v-model="colorPicked"
            :options="colorOptions"
            placeholder="Pick colors"
            searchable
          >
            <template #option="{ option }">
              <span style="display: inline-flex; align-items: center; gap: 10px;">
                <span :style="{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '3px', background: option.hex, border: '1px solid var(--ink-08)' }" />
                <span>{{ option.label }}</span>
                <code style="font-family: var(--mono); font-size: 11px; color: var(--ink-40); margin-left: 8px;">{{ option.hex }}</code>
              </span>
            </template>
            <template #footer="{ close }">
              <div style="display: flex; justify-content: flex-end;">
                <Button size="sm" variant="primary" @click="close">Done</Button>
              </div>
            </template>
          </MultiSelect>
        </Field>
      </div>
    </Variant>

    <Variant title="Count-only trigger">
      <div style="max-width: 320px;">
        <MultiSelect
          v-model="jurisdictions"
          :options="jurisdictionOptions"
          placeholder="All jurisdictions"
          count-only
          searchable
        />
      </div>
    </Variant>
  </Story>
</template>
