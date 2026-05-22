<script setup>
import { ref } from "vue"
import Accordion from "../components/Accordion.vue"

const open = ref("workflow")

const items = [
  {
    key: "intake",
    eyebrow: "Step 1",
    label: "Intake",
    content: "We pull the tenant ledger, the lease, and the notice. The model extracts the breach class and the cure window - an attorney signs off before anything advances.",
  },
  {
    key: "workflow",
    eyebrow: "Step 2",
    label: "Workflow synthesis",
    content: "The system reads the jurisdiction's statutes and court rules and proposes a routing plan: which forms to file, in what order, and on what calendar.",
  },
  {
    key: "filing",
    eyebrow: "Step 3",
    label: "Filing",
    content: "Forms are populated from the case state and submitted through the appropriate channel (e-file, fax, courier). We track receipts and surface conflicts back to the attorney.",
  },
  {
    key: "hearing",
    eyebrow: "Step 4",
    label: "Hearing",
    disabled: true,
    content: "Hearing prep would render here.",
  },
]
</script>

<template>
  <Story title="Accordion">
    <Variant title="Bordered (single)">
      <div style="max-width: 640px;">
        <Accordion v-model="open" :items="items" />
      </div>
    </Variant>

    <Variant title="Multiple open">
      <div style="max-width: 640px;">
        <Accordion type="multiple" :items="items" :modelValue="['intake', 'workflow']" />
      </div>
    </Variant>

    <Variant title="Flush (no outer border)">
      <div style="max-width: 640px;">
        <Accordion variant="flush" :items="items" />
      </div>
    </Variant>
  </Story>
</template>
