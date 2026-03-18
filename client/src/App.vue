<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from './api.js'

const config = ref({ queue: false, cron: false, limit: [], workflow: false, realtime: false })
const route = useRoute()

onMounted(async () => {
  const res = await fetch(api('/config'))
  if (res.ok) config.value = await res.json()
})

const tabs = computed(() => {
  const t = [{ label: 'overview', path: '/' }]
  if (config.value.realtime) t.push({ label: 'realtime', path: '/realtime' })
  if (config.value.queue) t.push({ label: 'queue', path: '/queue' })
  if (config.value.cron) t.push({ label: 'cron', path: '/cron' })
  if (config.value.limit.length) t.push({ label: 'limits', path: '/limits' })
  if (config.value.workflow) {
    t.push({ label: 'workflows', path: '/workflows' })
    t.push({ label: 'executions', path: '/executions' })
  }
  return t
})

function isActive(tab) {
  if (tab.path === '/') return route.path === '/'
  return route.path.startsWith(tab.path)
}

const isRealtimeRoute = computed(() => route.path.startsWith('/realtime'))
</script>

<template>
  <div class="app">
    <div class="top-bar">
      <div class="top-bar-left">
        <span class="logo">prsm <span>devtools</span></span>
      </div>
    </div>

    <div class="nav-bar">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        :class="{ active: isActive(tab) }"
      >
        {{ tab.label }}
      </router-link>
    </div>

    <template v-if="isRealtimeRoute">
      <router-view :config="config" />
    </template>
    <template v-else>
      <div class="page-scroll">
        <div class="page-content">
          <router-view :config="config" />
        </div>
      </div>
    </template>
  </div>
</template>
