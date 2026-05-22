<script setup>
import Card from "../components/Card.vue"
import SectionLabel from "../components/SectionLabel.vue"
import Stat from "../components/Stat.vue"
import Button from "../components/Button.vue"
</script>

<template>
  <Story title="Card">
    <Variant title="Basic">
      <Card padded style="max-width: 360px;">
        <SectionLabel>Project</SectionLabel>
        <h3 style="margin: 8px 0 6px;">Inference API</h3>
        <p style="font-size: 14px; color: var(--ink-60); margin: 0;">A streaming endpoint with response shaping and retries.</p>
      </Card>
    </Variant>
    <Variant title="Elevated, interactive">
      <Card padded elevated interactive style="max-width: 360px;">
        <Stat label="Throughput" value="1,420" caption="Requests / sec" size="md" />
      </Card>
    </Variant>
    <Variant title="Dark">
      <Card padded dark style="max-width: 360px;">
        <SectionLabel dark>Research</SectionLabel>
        <h3 style="margin: 8px 0 6px;">Sparse Attention</h3>
        <p style="font-size: 14px; color: var(--paper-on-dark-60); margin: 0 0 12px;">A look at long-context tradeoffs.</p>
        <Button variant="glass">Read more</Button>
      </Card>
    </Variant>
  </Story>
</template>
