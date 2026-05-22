<script setup>
import Tooltip from "../components/Tooltip.vue"
import Button from "../components/Button.vue"
</script>

<template>
  <Story title="Tooltip">
    <Variant title="Placements">
      <div style="display: grid; grid-template-columns: repeat(4, auto); gap: 24px; padding: 80px;">
        <Tooltip text="Top tooltip" placement="top"><Button>Top</Button></Tooltip>
        <Tooltip text="Bottom tooltip" placement="bottom"><Button>Bottom</Button></Tooltip>
        <Tooltip text="Left tooltip" placement="left"><Button>Left</Button></Tooltip>
        <Tooltip text="Right tooltip" placement="right"><Button>Right</Button></Tooltip>
      </div>
    </Variant>
    <Variant title="Long content">
      <Tooltip placement="top">
        <Button>Hover</Button>
        <template #content>
          Hover-only tooltip that stays out of the way.
        </template>
      </Tooltip>
    </Variant>
  </Story>
</template>
