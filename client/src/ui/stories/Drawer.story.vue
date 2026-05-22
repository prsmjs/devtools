<script setup>
import { ref } from "vue"
import Drawer from "../components/Drawer.vue"
import Button from "../components/Button.vue"
import Input from "../components/Input.vue"
import Textarea from "../components/Textarea.vue"
import Field from "../components/Field.vue"
import KeyValue from "../components/KeyValue.vue"
import Badge from "../components/Badge.vue"

const right = ref(false)
const left = ref(false)
const bottom = ref(false)
</script>

<template>
  <Story title="Drawer">
    <Variant title="Right (detail drawer)">
      <Button variant="primary" @click="right = true">Open case 2026-EVN-2401</Button>
      <Drawer v-model="right" side="right" size="md" eyebrow="Case detail" title="2026-EVN-2401">
        <KeyValue :items="[
          { label: 'Tenant', value: 'Aiyana Khan' },
          { label: 'Jurisdiction', value: 'Denver County, CO' },
          { label: 'Filed', value: 'May 14, 2026' },
          { label: 'Confidence', value: '0.92' },
        ]">
          <template #value="{ item }">
            <Badge v-if="item.label === 'Confidence'" variant="active" dot>{{ item.value }}</Badge>
            <span v-else>{{ item.value }}</span>
          </template>
        </KeyValue>

        <p style="margin-top: 16px; color: var(--ink-60); font-size: 14px; line-height: 1.5;">
          Tenant did not respond to the 10-day demand for compliance. Workflow proceeded to file complaint.
        </p>

        <template #footer="{ close }">
          <Button variant="ghost" @click="close">Cancel</Button>
          <Button variant="primary" @click="close">Open in new tab</Button>
        </template>
      </Drawer>
    </Variant>

    <Variant title="Left (filters)">
      <Button @click="left = true">Open filters</Button>
      <Drawer v-model="left" side="left" size="sm" title="Filters">
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <Field label="Search"><Input placeholder="Case ID, tenant..." /></Field>
          <Field label="Status"><Input placeholder="Any status" /></Field>
        </div>
        <template #footer="{ close }">
          <Button variant="ghost" @click="close">Clear</Button>
          <Button variant="primary" @click="close">Apply</Button>
        </template>
      </Drawer>
    </Variant>

    <Variant title="Bottom (quick action)">
      <Button @click="bottom = true">Add a note</Button>
      <Drawer v-model="bottom" side="bottom" size="sm" title="Add a note">
        <Textarea placeholder="Internal note for the case file..." :rows="4" />
        <template #footer="{ close }">
          <Button variant="ghost" @click="close">Cancel</Button>
          <Button variant="primary" @click="close">Save note</Button>
        </template>
      </Drawer>
    </Variant>
  </Story>
</template>
