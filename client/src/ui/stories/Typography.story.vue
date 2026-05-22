<script setup>
import Display from "../components/Display.vue"
import MonoLabel from "../components/MonoLabel.vue"
import SectionLabel from "../components/SectionLabel.vue"
import FieldLabel from "../components/FieldLabel.vue"
</script>

<template>
  <Story title="Typography">
    <Variant title="Display">
      <Display size="xl">The Future</Display>
      <Display size="lg" style="margin-top: 24px;">Display large</Display>
      <h1 style="margin-top: 24px;">Heading 1 - 40px</h1>
      <h2 style="margin-top: 12px;">Heading 2 - 28px</h2>
      <h3 style="margin-top: 12px;">Heading 3 - 22px</h3>
      <h4 style="margin-top: 12px;">Heading 4 - 18px</h4>
      <p style="margin-top: 16px;">Body - 16px with the system's tight tracking. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    </Variant>
    <Variant title="Mono / labels">
      <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start;">
        <SectionLabel size="xs">Section label xs</SectionLabel>
        <SectionLabel size="sm">Section label sm</SectionLabel>
        <SectionLabel size="md">Section label md</SectionLabel>
        <FieldLabel>Field label</FieldLabel>
        <MonoLabel size="lg">Mono lg</MonoLabel>
      </div>
    </Variant>
  </Story>
</template>
