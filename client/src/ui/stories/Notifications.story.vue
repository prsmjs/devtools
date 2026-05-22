<script setup>
import Notifications from "../components/Notifications.vue"
import Button from "../components/Button.vue"
import { toast } from "../composables/toast.js"

const fireSuccess = () => toast.success("Workflow saved", { description: "v2.1 is now live in Cherry Creek PG." })
const fireInfo = () => toast.info("Edit mode on", { description: "Draft changes won't go live until signed." })
const fireWarn = () => toast.warning("Approaching rate limit", { duration: 5000 })
const fireError = () => toast.error("Couldn't sign workflow", {
  description: "An attorney must be present in the room.",
  duration: 0,
})
const fireWithAction = () => toast({
  variant: "neutral",
  eyebrow: "Archived",
  title: "Moved 3 cases to archive",
  action: { label: "Undo", onClick: () => toast.success("Restored", { duration: 2000 }) },
})
const fireSticky = () => toast({
  variant: "info",
  title: "Sticky toast",
  description: "duration: 0 means this stays until dismissed.",
  duration: 0,
})

const fireAll = () => {
  fireSuccess()
  fireInfo()
  fireWarn()
}
</script>

<template>
  <Story title="Notifications">
    <Variant title="Compare - plain vs gradient">
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <Button variant="primary" @click="fireAll">Fire one of each</Button>
        <Button variant="ghost" @click="fireSuccess">Success</Button>
        <Button variant="ghost" @click="fireInfo">Info</Button>
        <Button variant="ghost" @click="fireWarn">Warning</Button>
        <Button variant="ghost" @click="fireWithAction">With action</Button>
      </div>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">
        Fire a toast - it shows <strong>plain (icon on white)</strong> bottom-left and
        <strong>gradient (tinted)</strong> bottom-right, at the same time, so you can compare.
      </p>
      <Notifications position="bottom-left" />
      <Notifications position="bottom-right" tinted />
    </Variant>

    <Variant title="Plain (current)">
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <Button variant="primary" @click="fireSuccess">Success</Button>
        <Button variant="ghost" @click="fireInfo">Info</Button>
        <Button variant="ghost" @click="fireWarn">Warning</Button>
        <Button variant="ghost" @click="fireError">Error (sticky)</Button>
        <Button variant="ghost" @click="fireWithAction">With action</Button>
        <Button variant="subtle" @click="fireSticky">Sticky neutral</Button>
      </div>
      <Notifications position="bottom-right" />
    </Variant>

    <Variant title="Gradient (tinted)">
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <Button variant="primary" @click="fireSuccess">Success</Button>
        <Button variant="ghost" @click="fireInfo">Info</Button>
        <Button variant="ghost" @click="fireWarn">Warning</Button>
        <Button variant="ghost" @click="fireError">Error (sticky)</Button>
        <Button variant="ghost" @click="fireWithAction">With action</Button>
        <Button variant="subtle" @click="fireSticky">Sticky neutral</Button>
      </div>
      <Notifications position="bottom-right" tinted />
    </Variant>
  </Story>
</template>
