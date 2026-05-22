<script setup>
import { ref } from "vue"
import Table from "../components/Table.vue"
import Badge from "../components/Badge.vue"
import Card from "../components/Card.vue"

// --- rich workflow registry (reproduces the prototype table) ---
const workflowColumns = [
  { key: "name", label: "Workflow", primary: true, subtitle: "code" },
  { key: "jurisdiction", label: "Jurisdiction" },
  { key: "version", label: "Version", mono: true },
  { key: "status", label: "Status" },
  { key: "signedBy", label: "Signed by" },
  { key: "signed", label: "Signed" },
  { key: "activeCases", label: "Active cases", align: "right" },
]
const workflowRows = [
  { id: 1, name: "Denver Residential FED", code: "WF_DENVER_RESIDENTIAL", jurisdiction: "Denver, CO", version: "v3", status: "active", signedBy: "Theodora Whitfield, Esq.", signed: "Apr 22, 2026", activeCases: 16 },
  { id: 2, name: "Phoenix Special Detainer (legacy)", code: "WF_PHOENIX_LEGACY", jurisdiction: "Phoenix, AZ", version: "v7", status: "active", signedBy: "Marisol Reyna, Esq.", signed: "Feb 14, 2026", activeCases: 0 },
  { id: 3, name: "Austin Eviction Standard", code: "WF_AUSTIN_STD", jurisdiction: "Austin, TX", version: "v2", status: "paused", signedBy: "Devon Carter, Esq.", signed: "Mar 03, 2026", activeCases: 4 },
  { id: 4, name: "Nashville Detainer Draft", code: "WF_NASHVILLE_DRAFT", jurisdiction: "Nashville, TN", version: "v1", status: "draft", signedBy: "-", signed: "-", activeCases: 0 },
  { id: 5, name: "Portland Residential FED", code: "WF_PORTLAND_RESIDENTIAL", jurisdiction: "Portland, OR", version: "v5", status: "failed", signedBy: "Imani Okafor, Esq.", signed: "Jan 30, 2026", activeCases: 2 },
]

// --- generic minimal table ---
const genericColumns = [
  { key: "case", label: "Case" },
  { key: "jurisdiction", label: "Jurisdiction" },
  { key: "status", label: "Status" },
  { key: "updated", label: "Updated", align: "right" },
]
const genericRows = [
  { id: 1, case: "Cherry Creek 1402", jurisdiction: "Denver County", status: "active", updated: "2m ago" },
  { id: 2, case: "Aurora 2210", jurisdiction: "Arapahoe County", status: "paused", updated: "1h ago" },
  { id: 3, case: "Lakewood 89", jurisdiction: "Jefferson County", status: "failed", updated: "yesterday" },
  { id: 4, case: "Boulder 30", jurisdiction: "Boulder County", status: "draft", updated: "3 days ago" },
]

const lastClicked = ref(null)
</script>

<template>
  <Story title="Table">
    <Variant title="Workflow registry (rich)">
      <Card style="overflow: hidden;">
        <Table :columns="workflowColumns" :rows="workflowRows" clickable @row-click="r => lastClicked = r.name">
          <template #cell-status="{ value }">
            <Badge :variant="value">{{ value }}</Badge>
          </template>
        </Table>
      </Card>
      <div style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">
        Row clicked: <code>{{ lastClicked || "(none)" }}</code>
      </div>
    </Variant>

    <Variant title="Generic (minimal)">
      <Card style="overflow: hidden;">
        <Table :columns="genericColumns" :rows="genericRows">
          <template #cell-status="{ value }">
            <Badge :variant="value">{{ value }}</Badge>
          </template>
        </Table>
      </Card>
    </Variant>

    <Variant title="Compact density">
      <Card style="overflow: hidden;">
        <Table :columns="workflowColumns" :rows="workflowRows" compact>
          <template #cell-status="{ value }">
            <Badge :variant="value">{{ value }}</Badge>
          </template>
        </Table>
      </Card>
    </Variant>

    <Variant title="Empty">
      <Card style="overflow: hidden;">
        <Table :columns="genericColumns" :rows="[]" empty="No cases match these filters" />
      </Card>
    </Variant>
  </Story>
</template>
