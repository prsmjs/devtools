<script setup>
import Popover from "../components/Popover.vue"
import Button from "../components/Button.vue"
import Input from "../components/Input.vue"
import Field from "../components/Field.vue"
</script>

<template>
  <Story title="Popover">
    <Variant title="Click to open">
      <Popover placement="bottom-start">
        <template #trigger>
          <Button>Open popover</Button>
        </template>
        <template #default="{ close }">
          <div style="display: flex; flex-direction: column; gap: 8px; min-width: 240px;">
            <Field label="New name"><Input modelValue="Eviction workflow" /></Field>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <Button size="sm" variant="ghost" @click="close">Cancel</Button>
              <Button size="sm" variant="primary" @click="close">Save</Button>
            </div>
          </div>
        </template>
      </Popover>
    </Variant>
  </Story>
</template>
