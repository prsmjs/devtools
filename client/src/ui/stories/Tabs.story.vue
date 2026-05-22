<script setup>
import { ref } from "vue"
import Tabs from "../components/Tabs.vue"

const active = ref("overview")
const tabs = [
  { value: "overview", label: "Overview" },
  { value: "runs", label: "Runs", badge: 12 },
  { value: "settings", label: "Settings" },
  { value: "history", label: "History", disabled: true },
]
</script>

<template>
  <Story title="Tabs">
    <Variant title="Underline">
      <Tabs v-model="active" :tabs="tabs" />
      <div style="padding: 24px 0; font-size: 14px; color: var(--ink-60);">Active: {{ active }}</div>
    </Variant>
    <Variant title="Pills">
      <Tabs v-model="active" :tabs="tabs" variant="pills" />
    </Variant>
  </Story>
</template>
