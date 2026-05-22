<script setup>
import { ref } from "vue"
import Combobox from "../components/Combobox.vue"
import Field from "../components/Field.vue"

const jurisdiction = ref("denver")
const judge = ref(null)
const county = ref("denver")

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

const judges = [
  { value: "j1", label: "Hon. Theodora Whitfield", court: "Denver County" },
  { value: "j2", label: "Hon. Marcus Reyes", court: "Arapahoe County" },
  { value: "j3", label: "Hon. Ife Adebayo", court: "Jefferson County" },
  { value: "j4", label: "Hon. Daniela Park", court: "Boulder County" },
]
</script>

<template>
  <Story title="Combobox">
    <Variant title="Searchable (default)">
      <div style="max-width: 320px;">
        <Field label="Jurisdiction">
          <Combobox v-model="jurisdiction" :options="jurisdictionOptions" placeholder="Search counties..." />
        </Field>
      </div>
    </Variant>

    <Variant title="Single select (not searchable)">
      <div style="max-width: 320px;">
        <Field label="County" hint="No typing - click to pick from the list">
          <Combobox
            v-model="county"
            :options="jurisdictionOptions"
            :searchable="false"
            placeholder="Select a county"
          />
        </Field>
      </div>
    </Variant>

    <Variant title="Custom item render">
      <div style="max-width: 360px;">
        <Field label="Assigned judge">
          <Combobox v-model="judge" :options="judges" placeholder="Search judges...">
            <template #option="{ option }">
              <span style="flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                <span>{{ option.label }}</span>
                <span class="pc-mono" style="color: var(--ink-60); font-size: 10px; letter-spacing: 0.06em;">{{ option.court }}</span>
              </span>
            </template>
          </Combobox>
        </Field>
      </div>
    </Variant>
  </Story>
</template>
