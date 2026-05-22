<script setup>
import { ref } from "vue"
import Modal from "../components/Modal.vue"
import Button from "../components/Button.vue"
import Input from "../components/Input.vue"
import Field from "../components/Field.vue"

const open = ref(false)
const confirmOpen = ref(false)

// async confirm
const asyncOpen = ref(false)
const deleting = ref(false)
const runDelete = () => {
  deleting.value = true
  // simulate a slow server action - the dialog stays open until it resolves
  setTimeout(() => {
    deleting.value = false
    asyncOpen.value = false
  }, 2200)
}
</script>

<template>
  <Story title="Modal">
    <Variant title="Form modal">
      <Button @click="open = true">Open form modal</Button>
      <Modal v-model="open" title="Create workflow" size="md">
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <Field label="Name"><Input placeholder="My new workflow" /></Field>
          <Field label="Description" hint="Optional"><Input placeholder="What does it do?" /></Field>
        </div>
        <template #footer="{ close }">
          <Button variant="ghost" @click="close">Cancel</Button>
          <Button variant="primary" @click="close">Create</Button>
        </template>
      </Modal>
    </Variant>

    <Variant title="Confirm">
      <Button @click="confirmOpen = true">Delete...</Button>
      <Modal v-model="confirmOpen" title="Delete jurisdiction?" size="sm">
        <p style="margin: 0; color: var(--ink-60); font-size: 14px;">
          This will remove the jurisdiction and any cases associated with it.
        </p>
        <template #footer="{ close }">
          <Button variant="ghost" @click="close">Cancel</Button>
          <Button variant="primary" style="background: var(--status-failed);" @click="close">Delete</Button>
        </template>
      </Modal>
    </Variant>

    <Variant title="Async confirm (loading)">
      <Button @click="asyncOpen = true">Delete jurisdiction...</Button>
      <Modal
        v-model="asyncOpen"
        title="Delete jurisdiction?"
        size="sm"
        :close-on-backdrop="!deleting"
        :close-on-esc="!deleting"
      >
        <p style="margin: 0; color: var(--ink-60); font-size: 14px; line-height: 1.5;">
          This permanently removes <strong style="color: var(--ink);">Denver, CO</strong>
          and all 16 cases bound to it. This cannot be undone.
        </p>
        <template #footer="{ close }">
          <Button variant="ghost" :disabled="deleting" @click="close">Cancel</Button>
          <Button
            variant="primary"
            style="background: var(--status-failed);"
            :loading="deleting"
            loading-label="Deleting…"
            @click="runDelete"
          >
            Delete jurisdiction
          </Button>
        </template>
      </Modal>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">
        The button shows a spinner and the dialog stays open (backdrop + Esc disabled)
        until the simulated 2.2s action finishes - then it closes itself.
      </p>
    </Variant>
  </Story>
</template>
