<script setup>
import { ref } from "vue"
import ContextMenu from "../components/ContextMenu.vue"
import Card from "../components/Card.vue"

const last = ref(null)
const items = [
  { label: "Edit", icon: "lucide:pencil", shortcut: ["⌘", "E"] },
  { label: "Duplicate", icon: "lucide:copy", shortcut: ["⌘", "D"] },
  { label: "Rename", icon: "lucide:pen-line" },
  { divider: true },
  {
    label: "Move to",
    icon: "lucide:folder-input",
    items: [
      { label: "Active workflows", icon: "lucide:folder" },
      { label: "Archive", icon: "lucide:archive" },
      { label: "Trash", icon: "lucide:trash-2", danger: true },
    ],
  },
  {
    label: "Share",
    icon: "lucide:share-2",
    items: [
      { label: "Copy link", icon: "lucide:link", shortcut: ["⌘", "L"] },
      { label: "Invite people", icon: "lucide:user-plus", shortcut: ["⌘", "I"] },
      { divider: true },
      { label: "Make public", icon: "lucide:globe" },
      { label: "Sharing settings…", icon: "lucide:settings-2", disabled: true },
    ],
  },
  { divider: true },
  { label: "Export", icon: "lucide:download", shortcut: ["⌘", "⇧", "E"] },
  { divider: true },
  { label: "Delete", icon: "lucide:trash-2", danger: true, shortcut: ["⌘", "⌫"] },
]
const onSelect = (item) => { last.value = item.label }
</script>

<template>
  <Story title="ContextMenu">
    <Variant title="With submenus + icons">
      <div style="padding: 24px;">
        <ContextMenu :items="items" @select="onSelect">
          <Card padded style="min-height: 180px; display: flex; align-items: center; justify-content: center; cursor: context-menu;">
            <div style="color: var(--ink-60); font-size: 14px;">Right-click anywhere in this card</div>
          </Card>
        </ContextMenu>
        <div style="margin-top: 16px; font-size: 13px; color: var(--ink-60);">
          Last action: <code>{{ last || "(none)" }}</code>
        </div>
      </div>
    </Variant>

    <Variant title="Without icons">
      <ContextMenu
        :items="[
          { label: 'Cut', shortcut: ['⌘', 'X'] },
          { label: 'Copy', shortcut: ['⌘', 'C'] },
          { label: 'Paste', shortcut: ['⌘', 'V'], disabled: true },
          { divider: true },
          { label: 'Select all', shortcut: ['⌘', 'A'] },
        ]"
        @select="onSelect"
      >
        <div style="padding: 32px; border: 1px dashed var(--ink-20); border-radius: 8px; text-align: center; color: var(--ink-60);">
          Right-click here (no icons)
        </div>
      </ContextMenu>
    </Variant>
  </Story>
</template>
