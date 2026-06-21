<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api.js'
import PageHeader from '../ui/components/PageHeader.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import Stat from '../ui/components/Stat.vue'
import Tabs from '../ui/components/Tabs.vue'

defineProps({ config: Object })

const route = useRoute()
const router = useRouter()

const available = ref(true)
const overview = ref(null)
const roles = computed(() => overview.value?.roles ?? {})
const statuses = computed(() => overview.value?.statuses ?? {})
const mechanisms = computed(() => overview.value?.mechanisms ?? {})

const tabs = [
  { value: 'accounts', label: 'Accounts' },
  { value: 'activity', label: 'Activity' },
]
const currentTab = computed(() => route.path.split('/')[2] || 'accounts')
function goTab(id) {
  if (currentTab.value !== id) router.push(`/auth/${id}`)
}

onMounted(async () => {
  try {
    const res = await fetch(api('/config'))
    if (res.ok) available.value = !!(await res.json()).auth
  } catch {}
  if (available.value) loadOverview()
})

async function loadOverview() {
  try {
    const res = await fetch(api('/auth/overview'))
    if (res.ok) overview.value = await res.json()
  } catch {}
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Identity"
      title="Auth"
      subtitle="Accounts, roles, providers, two-factor methods, and the activity log from a @prsm/auth context."
    />

    <div class="page-body">
      <EmptyState
        v-if="!available"
        title="No auth context configured"
        description="An object from createAuthContext() passed to devtools as `auth` will appear here."
      />

      <template v-else>
        <div v-if="overview" class="stats">
          <Stat :value="overview.stats.accounts" label="Accounts" />
          <Stat :value="overview.stats.providers" label="Linked providers" />
          <Stat :value="overview.stats.twoFactorMethods" label="2FA methods" />
          <Stat :value="overview.activityStats.recentLogins" label="Logins (24h)" />
          <Stat :value="overview.activityStats.failedAttempts" label="Failed (24h)" />
        </div>

        <Tabs :model-value="currentTab" :tabs="tabs" variant="underline" class="tabs" @update:model-value="goTab" />

        <router-view :roles="roles" :statuses="statuses" :mechanisms="mechanisms" @mutated="loadOverview" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.tabs { margin-bottom: 16px; }
</style>
