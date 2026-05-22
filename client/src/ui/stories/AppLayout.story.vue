<script setup>
import { ref } from "vue"
import AppLayout from "../components/AppLayout.vue"
import SideNav from "../components/SideNav.vue"
import PageHeader from "../components/PageHeader.vue"
import Button from "../components/Button.vue"
import Card from "../components/Card.vue"
import Stat from "../components/Stat.vue"
import Badge from "../components/Badge.vue"
import Avatar from "../components/Avatar.vue"
import { NavIcon } from "./nav-icons.js"

const active = ref("overview")
const sections = [
  {
    title: "Operate",
    items: [
      { key: "inbox", label: "Inbox", icon: "inbox", badge: 4 },
      { key: "overview", label: "Overview", icon: "overview" },
      { key: "intakes", label: "Intake runs", icon: "intakes" },
      { key: "cases", label: "Cases", icon: "cases" },
    ],
  },
  {
    title: "Configure",
    items: [
      { key: "jurisdictions", label: "Jurisdictions", icon: "jurisdictions" },
      { key: "workflows", label: "Workflows", icon: "workflows" },
      { key: "forms", label: "Forms", icon: "forms" },
    ],
  },
  {
    title: "Verify",
    items: [{ key: "evals", label: "Evaluations", icon: "evaluations" }],
  },
]
</script>

<template>
  <Story title="AppLayout" :layout="{ type: 'single', iframe: true }">
    <Variant title="Full shell">
      <AppLayout>
        <template #nav>
          <SideNav :sections="sections" :active-key="active" @select="active = $event.key">
            <template #icon="{ item }">
              <NavIcon :name="item.icon" />
            </template>
            <template #header>
              <div>
                <div style="font-size: 20px; font-weight: 500; letter-spacing: -0.6px;">Pastel</div>
                <div class="pc-mono" style="color: var(--ink-60); font-size: 10px;">Design system</div>
              </div>
            </template>
            <template #footer>
              <div style="display: flex; align-items: center; gap: 10px;">
                <Avatar name="Jonathan Pyers" size="md" />
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <div style="font-size: 13px;">Jonathan Pyers</div>
                  <div class="pc-mono" style="color: var(--ink-60); font-size: 9px;">PM Admin</div>
                </div>
              </div>
            </template>
          </SideNav>
        </template>
        <PageHeader title="Overview" subtitle="A snapshot of the last 24 hours." eyebrow="Dashboard">
          <template #actions>
            <Button variant="ghost">Export</Button>
            <Button variant="primary">New run</Button>
          </template>
        </PageHeader>

        <div style="padding: 0 32px 32px; display: flex; flex-direction: column; gap: 16px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <Card padded><Stat label="Open cases" value="38" caption="across 4 jurisdictions" size="lg" /></Card>
            <Card padded><Stat label="Intake runs" value="124" caption="this week" size="lg" /></Card>
            <Card padded><Stat label="Forms" value="9" caption="active templates" size="lg" /></Card>
            <Card padded><Stat label="Eval pass" value="96%" caption="last 100 runs" size="lg" /></Card>
          </div>
          <Card padded>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 style="margin: 0;">Recent activity</h3>
              <Badge variant="active" dot>live</Badge>
            </div>
            <p style="color: var(--ink-60); margin: 8px 0 0;">Activity feed would render here.</p>
          </Card>
        </div>
      </AppLayout>
    </Variant>
  </Story>
</template>
