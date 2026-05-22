<script setup>
import ArrowLink from "../components/ArrowLink.vue"
import Card from "../components/Card.vue"
import SectionLabel from "../components/SectionLabel.vue"
</script>

<template>
  <Story title="ArrowLink">
    <Variant title="Directions">
      <div style="display: flex; gap: 28px; align-items: center;">
        <ArrowLink>Continue</ArrowLink>
        <ArrowLink arrow="left">Back</ArrowLink>
        <ArrowLink arrow="up-right">Open in new tab</ArrowLink>
      </div>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">
        Hover any link - the arrow nudges in its own direction.
      </p>
    </Variant>

    <Variant title="Mono (card-header style)">
      <Card padded style="max-width: 360px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <SectionLabel>Jurisdictions</SectionLabel>
          <ArrowLink mono>All</ArrowLink>
        </div>
        <p style="margin-top: 10px; font-size: 14px; color: var(--ink-60);">
          Card-header pattern: a section label on the left, an arrow link on the right.
        </p>
      </Card>
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; gap: 24px; align-items: center;">
        <ArrowLink size="sm">Small</ArrowLink>
        <ArrowLink size="md">Medium</ArrowLink>
        <ArrowLink size="sm" mono>Mono sm</ArrowLink>
        <ArrowLink size="md" mono>Mono md</ArrowLink>
      </div>
    </Variant>

    <Variant title="Disabled">
      <ArrowLink disabled>Unavailable</ArrowLink>
    </Variant>
  </Story>
</template>
