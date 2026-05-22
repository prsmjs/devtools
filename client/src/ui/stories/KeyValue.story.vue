<script setup>
import KeyValue from "../components/KeyValue.vue"
import Card from "../components/Card.vue"
import Badge from "../components/Badge.vue"

const items = [
  { label: "Case ID", value: "2026-EVN-2401" },
  { label: "Tenant", value: "Aiyana Khan" },
  { label: "Jurisdiction", value: "Denver County, CO" },
  { label: "Filed", value: "May 14, 2026" },
  { label: "Status", value: "active" },
  { label: "Confidence", value: "0.92" },
]
</script>

<template>
  <Story title="KeyValue">
    <Variant title="Row layout (in card)">
      <Card padded style="max-width: 480px;">
        <KeyValue :items="items">
          <template #value="{ item }">
            <Badge v-if="item.label === 'Status'" variant="active" dot>{{ item.value }}</Badge>
            <span v-else>{{ item.value }}</span>
          </template>
        </KeyValue>
      </Card>
    </Variant>

    <Variant title="Stacked">
      <Card padded style="max-width: 320px;">
        <KeyValue :items="items.slice(0, 4)" layout="stack" />
      </Card>
    </Variant>

    <Variant title="Compact">
      <Card padded style="max-width: 480px;">
        <KeyValue :items="items" compact />
      </Card>
    </Variant>

    <Variant title="Divided + boxed">
      <div style="max-width: 420px;">
        <KeyValue
          layout="divided"
          boxed
          :items="[
            { label: 'Provider', value: 'Anthropic · Balanced' },
            { label: 'Pricing', value: '$3.00 / 1M in · $15.00 / 1M out' },
            { label: 'Context', value: '1M tokens' },
            { label: 'Released', value: 'Feb 25, 2026' },
          ]"
        />
      </div>
    </Variant>

    <Variant title="Divided (no box)">
      <div style="max-width: 420px;">
        <KeyValue layout="divided" :items="items" />
      </div>
    </Variant>
  </Story>
</template>
