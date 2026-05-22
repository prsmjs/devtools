<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api.js'
import PageHeader from '../ui/components/PageHeader.vue'
import EmptyState from '../ui/components/EmptyState.vue'
import LimiterPanel from '../components/LimiterPanel.vue'

const limiters = ref([])
const loaded = ref(false)

onMounted(async () => {
  const res = await fetch(api('/limits'))
  if (res.ok) {
    const data = await res.json()
    limiters.value = data.limiters
  }
  loaded.value = true
})
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Rate limiting"
      title="Limits"
      subtitle="Registered limiters, their most recently touched keys, and a peek-and-reset tool for any key."
    />

    <div class="page-body">
      <EmptyState
        v-if="loaded && !limiters.length"
        title="No limiters registered"
        description="Named limiters passed to devtools will appear here."
      />
      <div v-else class="limit-grid">
        <LimiterPanel v-for="name in limiters" :key="name" :name="name" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.limit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
  align-items: start;
}
</style>
