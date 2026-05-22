<script setup>
import { ref } from "vue"
import SideNav from "../components/SideNav.vue"
import Avatar from "../components/Avatar.vue"
import { NavIcon } from "./nav-icons.js"

const a = ref("overview")
const b = ref("overview")
const c = ref("overview")
const d = ref("overview")

const sectionsBare = [
  {
    title: "Operate",
    items: [
      { key: "inbox", label: "Inbox", badge: 4 },
      { key: "overview", label: "Overview" },
      { key: "intakes", label: "Intake runs" },
      { key: "cases", label: "Cases" },
    ],
  },
  {
    title: "Configure",
    items: [
      { key: "jurisdictions", label: "Jurisdictions" },
      { key: "workflows", label: "Workflows" },
      { key: "forms", label: "Forms" },
    ],
  },
]

const sectionsIcons = [
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

const frame = "width: 280px; height: 540px; border: 1px solid var(--ink-08); border-radius: 8px; overflow: hidden;"
</script>

<template>
  <Story title="SideNav">
    <Variant title="Minimal (no indicators, no icons)">
      <div :style="frame">
        <SideNav :sections="sectionsBare" :active-key="a" @select="a = $event.key" />
      </div>
    </Variant>

    <Variant title="With indicator dots">
      <div :style="frame">
        <SideNav :sections="sectionsBare" :active-key="b" indicators @select="b = $event.key" />
      </div>
    </Variant>

    <Variant title="With icons">
      <div :style="frame">
        <SideNav :sections="sectionsIcons" :active-key="c" @select="c = $event.key">
          <template #icon="{ item }">
            <NavIcon :name="item.icon" />
          </template>
        </SideNav>
      </div>
    </Variant>

    <Variant title="With header + footer (full shell)">
      <div :style="frame">
        <SideNav :sections="sectionsIcons" :active-key="d" @select="d = $event.key">
          <template #icon="{ item }">
            <NavIcon :name="item.icon" />
          </template>
          <template #header>
            <div>
              <div style="font-size: 18px; font-weight: 500; letter-spacing: -0.5px;">Pastel</div>
              <div class="pc-mono" style="color: var(--ink-60); font-size: 10px;">Eviction workflow</div>
            </div>
          </template>
          <template #footer>
            <div style="display: flex; align-items: center; gap: 10px;">
              <Avatar name="Jonathan Pyers" size="sm" />
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="font-size: 13px;">Jonathan Pyers</div>
                <div class="pc-mono" style="color: var(--ink-60); font-size: 9px;">PM Admin</div>
              </div>
            </div>
          </template>
        </SideNav>
      </div>
    </Variant>

    <Variant title="Icon via scoped slot (custom render)">
      <div :style="frame">
        <SideNav
          :sections="[{
            title: 'Sources',
            items: [
              { key: 'statutes', label: 'Statutes', accent: '#bdbbff' },
              { key: 'court', label: 'Court rules', accent: '#ffd6f5' },
              { key: 'forms', label: 'Forms', accent: '#d6e1ff' },
            ],
          }]"
          :active-key="'statutes'"
        >
          <template #icon="{ item }">
            <span
              :style="{ width: '14px', height: '14px', borderRadius: '3px', background: item.accent, display: 'inline-block', flexShrink: 0, border: '1px solid var(--ink-08)' }"
            />
          </template>
        </SideNav>
      </div>
    </Variant>
  </Story>
</template>
