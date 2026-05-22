<script setup>
import { ref } from "vue"
import Toolbar from "../components/Toolbar.vue"
import SearchInput from "../components/SearchInput.vue"
import SegmentedControl from "../components/SegmentedControl.vue"
import FilterChip from "../components/FilterChip.vue"
import MultiSelect from "../components/MultiSelect.vue"
import DateRangePicker from "../components/DateRangePicker.vue"
import Button from "../components/Button.vue"
import Badge from "../components/Badge.vue"
import Pagination from "../components/Pagination.vue"
import Table from "../components/Table.vue"

const q = ref("")
const view = ref("table")
const statusFilter = ref(["active"])
const range = ref({ start: new Date(2026, 4, 1), end: new Date(2026, 4, 31) })
const page = ref(1)
const pageSize = ref(25)

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "failed", label: "Failed" },
]

const columns = [
  { key: "case", label: "Case" },
  { key: "tenant", label: "Tenant" },
  { key: "jurisdiction", label: "Jurisdiction" },
  { key: "status", label: "Status" },
  { key: "filed", label: "Filed", align: "right" },
]
const rows = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  case: `2026-EVN-${String(2400 + i).padStart(4, "0")}`,
  tenant: ["A. Khan", "M. Reyes", "R. Watanabe", "J. Park"][i % 4],
  jurisdiction: ["Denver County", "Arapahoe County", "Boulder County", "Jefferson County"][i % 4],
  status: ["active", "paused", "active", "failed"][i % 4],
  filed: `2026-05-${String(i + 1).padStart(2, "0")}`,
}))
</script>

<template>
  <Story title="Toolbar">
    <Variant title="Data-table toolbar (two rows)">
      <div style="border: 1px solid var(--ink-08); border-radius: 8px; overflow: hidden;">
        <Toolbar bordered>
          <template #leading>
            <SearchInput v-model="q" placeholder="Search cases" shortcut="⌘K" />
          </template>

          <template #trailing>
            <SegmentedControl
              v-model="view"
              :options="[
                { value: 'table', label: 'Table' },
                { value: 'cards', label: 'Cards' },
                { value: 'kanban', label: 'Kanban' },
              ]"
              size="sm"
            />
            <Button variant="ghost" size="sm">Export</Button>
            <Button variant="primary" size="sm">New case</Button>
          </template>

          <template #filters>
            <MultiSelect
              v-model="statusFilter"
              :options="statusOptions"
              placeholder="Any status"
              searchable
            />
            <DateRangePicker v-model="range" />
            <FilterChip label="Mine only" :active="true" />
            <FilterChip label="Unsigned" />
            <FilterChip label="High confidence" value="≥ 0.85" removable />
          </template>
        </Toolbar>

        <Table :columns="columns" :rows="rows" compact>
          <template #cell-status="{ value }">
            <Badge :variant="value">{{ value }}</Badge>
          </template>
        </Table>

        <Toolbar bordered size="sm">
          <Pagination
            :page="page"
            :page-size="pageSize"
            :total="248"
            @update:page="p => page = p"
            @update:pageSize="s => pageSize = s"
          />
        </Toolbar>
      </div>
    </Variant>

    <Variant title="Single row, sticky">
      <Toolbar bordered sticky>
        <template #leading><strong style="font-size: 15px;">Cases</strong></template>
        <Badge variant="active">3 live</Badge>
        <template #trailing>
          <Button variant="ghost" size="sm">Filters</Button>
          <Button variant="primary" size="sm">New</Button>
        </template>
      </Toolbar>
    </Variant>

    <Variant title="Two rows with divider">
      <div style="border: 1px solid var(--ink-08); border-radius: 8px;">
        <Toolbar divider>
          <template #leading>
            <strong style="font-size: 15px;">Workflows</strong>
            <Badge>v2.1</Badge>
          </template>
          <template #trailing>
            <Button variant="ghost" size="sm">History</Button>
            <Button variant="primary" size="sm">Save draft</Button>
          </template>
          <template #filters>
            <SearchInput v-model="q" placeholder="Filter steps" size="sm" />
            <FilterChip label="AI steps" :active="true" />
            <FilterChip label="Human" />
            <FilterChip label="Tool" />
          </template>
        </Toolbar>
      </div>
    </Variant>
  </Story>
</template>
