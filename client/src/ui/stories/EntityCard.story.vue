<script setup>
import EntityCard from "../components/EntityCard.vue"

const jurisdictions = [
  {
    monogram: "CO", title: "Denver, CO", subtitle: "Denver County",
    status: "active", statusVariant: "active",
    metrics: [
      { label: "Rules", value: 8 },
      { label: "Active cases", value: 16 },
      { label: "Workflow version", value: "v3", mono: true },
    ],
    footer: "Signed by Theodora Whitfield, Esq.",
  },
  {
    monogram: "AZ", title: "Phoenix, AZ", subtitle: "Maricopa County",
    status: "active", statusVariant: "active",
    metrics: [
      { label: "Rules", value: 12 },
      { label: "Active cases", value: 0 },
      { label: "Workflow version", value: "v7", mono: true },
    ],
    footer: "Signed by Marisol Reyna, Esq.",
  },
  {
    monogram: "TN", title: "Nashville, TN", subtitle: "Davidson County",
    status: "draft", statusVariant: "draft",
    metrics: [
      { label: "Rules", value: 3 },
      { label: "Active cases", value: 0 },
      { label: "Workflow version", value: "-", mono: true },
    ],
    footer: "Not yet signed",
  },
]
</script>

<template>
  <Story title="EntityCard">
    <Variant title="Jurisdiction card (reproduction)">
      <div style="max-width: 360px;">
        <EntityCard v-bind="jurisdictions[0]" interactive />
      </div>
    </Variant>

    <Variant title="Grid of cards">
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
        <EntityCard
          v-for="j in jurisdictions"
          :key="j.title"
          v-bind="j"
          :gradient="j.status === 'active'"
          interactive
        />
      </div>
    </Variant>

    <Variant title="Custom footer slot">
      <div style="max-width: 360px;">
        <EntityCard
          monogram="OR"
          title="Portland, OR"
          subtitle="Multnomah County"
          status="active"
          status-variant="active"
          :metrics="[
            { label: 'Rules', value: 21 },
            { label: 'Active cases', value: 9 },
            { label: 'Workflow version', value: 'v5', mono: true },
          ]"
        >
          <template #footer>
            <span style="display: inline-flex; align-items: center; gap: 6px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--status-active);" />
              Synced 4 minutes ago
            </span>
          </template>
        </EntityCard>
      </div>
    </Variant>

    <Variant title="Many metrics - card grows with its container">
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- wide container: 6 metrics, long labels, no wrapping -->
        <div style="max-width: 620px;">
          <EntityCard
            monogram="CO"
            title="Denver, CO"
            subtitle="Denver County"
            status="active"
            status-variant="active"
            :metrics="[
              { label: 'Rules', value: 8 },
              { label: 'Active cases this quarter', value: 16 },
              { label: 'Workflow version', value: 'v3', mono: true },
              { label: 'Forms', value: 12 },
              { label: 'Average days to first filing', value: 21 },
              { label: 'Eval pass', value: '96%' },
            ]"
            footer="Signed by Theodora Whitfield, Esq."
          />
        </div>

        <!-- narrow container with long labels: drop to 2 columns so they fit -->
        <div style="max-width: 360px;">
          <EntityCard
            monogram="AZ"
            title="Phoenix, AZ"
            subtitle="Maricopa County"
            status="active"
            status-variant="active"
            :metric-columns="2"
            :metrics="[
              { label: 'Rules', value: 12 },
              { label: 'Active cases this quarter', value: 9 },
              { label: 'Average days to first filing', value: 18 },
              { label: 'Eval pass rate', value: '94%' },
            ]"
            footer="Signed by Marisol Reyna, Esq."
          />
        </div>
      </div>
    </Variant>
  </Story>
</template>

