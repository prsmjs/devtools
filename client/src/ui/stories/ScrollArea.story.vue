<script setup>
import ScrollArea from "../components/ScrollArea.vue"
import Card from "../components/Card.vue"

const rows = Array.from({ length: 40 }, (_, i) => `Case 2026-EVN-${String(2400 + i).padStart(4, "0")}`)
const wide = Array.from({ length: 12 }, (_, i) =>
  `Column ${i + 1} - WORKFLOW.STEPS.DRAFT_DEMAND.OUTPUT.FIELD_${i}`
)
</script>

<template>
  <Story title="ScrollArea">
    <Variant title="Vertical (hover to reveal, idle to fade)">
      <Card style="width: 320px; overflow: hidden;">
        <ScrollArea max-height="260px">
          <div style="padding: 8px;">
            <div
              v-for="r in rows"
              :key="r"
              style="padding: 8px 10px; font-size: 14px; border-radius: 4px;"
            >{{ r }}</div>
          </div>
        </ScrollArea>
      </Card>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60); max-width: 320px;">
        Move into the list - the scrollbar appears. Hold still - it fades. Move
        again - it returns. Leave - it hides. No layout shift, transparent track.
      </p>
    </Variant>

    <Variant title="Always visible">
      <Card style="width: 320px; overflow: hidden;">
        <ScrollArea max-height="220px" always>
          <div style="padding: 8px;">
            <div
              v-for="r in rows"
              :key="r"
              style="padding: 8px 10px; font-size: 14px;"
            >{{ r }}</div>
          </div>
        </ScrollArea>
      </Card>
    </Variant>

    <Variant title="Both axes">
      <Card style="width: 360px; overflow: hidden;">
        <ScrollArea max-height="220px">
          <div style="padding: 8px; width: 720px;">
            <div
              v-for="r in wide"
              :key="r"
              style="padding: 8px 10px; font-size: 13px; font-family: var(--mono); white-space: nowrap;"
            >{{ r }}</div>
          </div>
        </ScrollArea>
      </Card>
    </Variant>

    <Variant title="Fixed height">
      <Card style="width: 320px; overflow: hidden;">
        <ScrollArea height="180px">
          <div style="padding: 8px;">
            <div
              v-for="r in rows"
              :key="r"
              style="padding: 8px 10px; font-size: 14px;"
            >{{ r }}</div>
          </div>
        </ScrollArea>
      </Card>
    </Variant>
  </Story>
</template>
