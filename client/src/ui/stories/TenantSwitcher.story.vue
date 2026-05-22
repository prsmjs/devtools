<script setup>
import { ref } from "vue"
import TenantSwitcher from "../components/TenantSwitcher.vue"
import SideNav from "../components/SideNav.vue"
import Avatar from "../components/Avatar.vue"
import Divider from "../components/Divider.vue"
import { NavIcon } from "./nav-icons.js"

const tenant = ref("cherry-creek")
const tenantB = ref("cherry-creek")

const tenants = [
  { value: "cherry-creek", name: "Cherry Creek PG", sublabel: "Property group" },
  { value: "highland", name: "Highland Residential", sublabel: "Property group" },
  { value: "aurora-mgmt", name: "Aurora Management Co.", sublabel: "Management" },
  { value: "summit", name: "Summit Holdings", sublabel: "Holding company" },
]

const sections = [
  {
    title: "Operate",
    items: [
      { key: "inbox", label: "Inbox", icon: "inbox", badge: 4 },
      { key: "overview", label: "Overview", icon: "overview" },
      { key: "cases", label: "Cases", icon: "cases" },
    ],
  },
  {
    title: "Configure",
    items: [
      { key: "jurisdictions", label: "Jurisdictions", icon: "jurisdictions" },
      { key: "workflows", label: "Workflows", icon: "workflows" },
    ],
  },
]
const active = ref("overview")
const frame = "width: 280px; height: 560px; border: 1px solid var(--ink-08); border-radius: 8px; overflow: hidden;"
</script>

<template>
  <Story title="TenantSwitcher">
    <Variant title="Standalone">
      <div style="width: 260px;">
        <TenantSwitcher v-model="tenant" :tenants="tenants" label="Tenant" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">
          Active: <code>{{ tenant }}</code>
        </p>
      </div>
    </Variant>

    <Variant title="With footer actions">
      <div style="width: 260px;">
        <TenantSwitcher v-model="tenant" :tenants="tenants">
          <template #footer="{ close }">
            <button class="demo-action" @click="close">+ Add a tenant</button>
            <button class="demo-action" @click="close">Tenant settings</button>
          </template>
        </TenantSwitcher>
      </div>
    </Variant>

    <Variant title="In a sidebar header">
      <div :style="frame">
        <SideNav :sections="sections" :active-key="active" @select="active = $event.key">
          <template #icon="{ item }"><NavIcon :name="item.icon" /></template>
          <template #header>
            <TenantSwitcher v-model="tenantB" :tenants="tenants" />
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
  </Story>
</template>

<style scoped>
.demo-action {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 8px;
  border-radius: var(--radius-sharp);
  font-family: var(--display);
  font-size: 13px;
  letter-spacing: -0.13px;
  color: var(--ink);
  background: transparent;
  border: 0;
  cursor: pointer;
}
.demo-action:hover { background: var(--ink-04); }
</style>
