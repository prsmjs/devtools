<script setup>
import Stat from "../components/Stat.vue"
import Card from "../components/Card.vue"
</script>

<template>
  <Story title="Stat">
    <Variant title="Sizes">
      <div style="display: flex; gap: 32px;">
        <Stat label="Active" value="124" size="md" caption="this week" />
        <Stat label="Active" value="124" size="lg" caption="this week" />
        <Stat label="Active" value="124" size="xl" caption="this week" />
      </div>
    </Variant>
    <Variant title="In cards">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 720px;">
        <Card padded elevated><Stat value="2x" caption="Faster" size="xl" /></Card>
        <Card padded elevated><Stat value="60%" caption="Cost cut" size="xl" /></Card>
        <Card padded elevated><Stat value="90%" caption="Uptime" size="xl" /></Card>
      </div>
    </Variant>
  </Story>
</template>
