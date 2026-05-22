<script setup>
import { ref } from "vue"
import DropdownMenu from "../components/DropdownMenu.vue"
import Button from "../components/Button.vue"

const last = ref(null)

const items = [
  { label: "Edit", value: "edit", shortcut: "⌘E" },
  { label: "Duplicate", value: "dup", shortcut: "⌘D" },
  { divider: true },
  { label: "Archive", value: "archive" },
  { label: "Delete", value: "delete", danger: true },
  { label: "Read only", value: "noop", disabled: true },
]
</script>

<template>
  <Story title="DropdownMenu">
    <Variant title="Default">
      <div style="padding: 60px;">
        <DropdownMenu :items="items" @select="last = $event.value">
          <Button variant="ghost">More actions ▾</Button>
        </DropdownMenu>
        <div style="margin-top: 16px; font-size: 13px; color: var(--ink-60);">
          Last selected: <code>{{ last }}</code>
        </div>
      </div>
    </Variant>
  </Story>
</template>
