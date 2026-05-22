<script setup>
import { ref } from "vue"
import Tree from "../components/Tree.vue"
import Card from "../components/Card.vue"

const expanded = ref(["sources", "statutes"])
const selected = ref("crs-13-40-104")

const items = [
  {
    key: "sources",
    label: "Sources",
    icon: "▣",
    children: [
      {
        key: "statutes",
        label: "Colorado statutes",
        icon: "§",
        badge: 14,
        children: [
          { key: "crs-13-40-104", label: "C.R.S. 13-40-104 - Grounds" },
          { key: "crs-13-40-107", label: "C.R.S. 13-40-107 - Notice to quit" },
          { key: "crs-13-40-111", label: "C.R.S. 13-40-111 - Issuance of summons" },
        ],
      },
      {
        key: "rules",
        label: "Court rules",
        icon: "§",
        children: [
          { key: "ccp-3", label: "C.R.C.P. Rule 3" },
          { key: "ccp-12", label: "C.R.C.P. Rule 12" },
        ],
      },
      {
        key: "forms",
        label: "Court forms",
        icon: "▢",
        children: [
          { key: "jdf-101", label: "JDF 101 - Complaint" },
          { key: "jdf-104", label: "JDF 104 - Summons", disabled: true },
        ],
      },
    ],
  },
  {
    key: "workflows",
    label: "Workflows",
    icon: "⇄",
    children: [
      { key: "wf-intake", label: "Intake → File" },
      { key: "wf-hearing", label: "Hearing prep" },
    ],
  },
  { key: "models", label: "Models", icon: "◇" },
]
</script>

<template>
  <Story title="Tree">
    <Variant title="With icons + badges">
      <Card padded style="max-width: 420px;">
        <Tree
          :items="items"
          v-model:expanded="expanded"
          v-model:selected="selected"
        />
      </Card>
    </Variant>

    <Variant title="Minimal">
      <Card padded style="max-width: 360px;">
        <Tree
          :items="[
            { key: 'a', label: 'Documents', children: [
              { key: 'a1', label: 'Filings', children: [
                { key: 'a1a', label: 'Complaint.pdf' },
                { key: 'a1b', label: 'Summons.pdf' },
              ]},
              { key: 'a2', label: 'Evidence' },
            ]},
            { key: 'b', label: 'Correspondence' },
          ]"
          :expanded="['a', 'a1']"
          selected="a1a"
        />
      </Card>
    </Variant>
  </Story>
</template>
