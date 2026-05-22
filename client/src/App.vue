<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { api } from './api.js'
import AppLayout from './ui/components/AppLayout.vue'
import SideNav from './ui/components/SideNav.vue'
import Notifications from './ui/components/Notifications.vue'

const config = ref({ queue: false, cron: false, limit: [], workflow: false, realtime: false, cells: [], lock: [] })
const route = useRoute()
const router = useRouter()

onMounted(async () => {
  const res = await fetch(api('/config'))
  if (res.ok) config.value = await res.json()
})

const navSections = computed(() => {
  const items = [{ key: '/', label: 'Overview', icon: 'lucide:layout-dashboard' }]
  if (config.value.realtime) items.push({ key: '/realtime', label: 'Realtime', icon: 'lucide:radio-tower' })
  if (config.value.cells?.length) items.push({ key: '/cells', label: 'Cells', icon: 'lucide:network' })
  if (config.value.lock?.length) items.push({ key: '/locks', label: 'Locks', icon: 'lucide:lock' })
  if (config.value.queue) items.push({ key: '/queue', label: 'Queue', icon: 'lucide:layers' })
  if (config.value.cron) items.push({ key: '/cron', label: 'Cron', icon: 'lucide:clock' })
  if (config.value.limit?.length) items.push({ key: '/limits', label: 'Limits', icon: 'lucide:gauge' })
  if (config.value.workflow) {
    items.push({ key: '/workflows', label: 'Workflows', icon: 'lucide:workflow' })
    items.push({ key: '/executions', label: 'Executions', icon: 'lucide:history' })
  }
  return [{ items }]
})

const activeKey = computed(() => {
  const p = route.path
  if (p === '/') return '/'
  const match = navSections.value[0].items
    .filter((i) => i.key !== '/')
    .find((i) => p.startsWith(i.key))
  return match ? match.key : '/'
})

function onSelect(item) {
  if (route.path !== item.key) router.push(item.key)
}
</script>

<template>
  <AppLayout nav-width="232px">
    <template #nav>
      <SideNav :sections="navSections" :active-key="activeKey" @select="onSelect">
        <template #header>
          <div class="brand">
            <span class="brand__mark">prsm</span>
            <span class="brand__sub">devtools</span>
          </div>
        </template>
        <template #icon="{ item }">
          <Icon :icon="item.icon" class="nav-icon" />
        </template>
      </SideNav>
    </template>
    <router-view :config="config" />
  </AppLayout>
  <Notifications position="bottom-right" />
</template>

<style scoped>
.brand {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 4px 0 2px;
}
.brand__mark {
  font-family: var(--display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.4px;
  color: var(--ink);
}
.brand__sub {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--ink-40);
}
.nav-icon {
  font-size: 17px;
}
</style>
