<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api.js'
import JsonView from '../components/JsonView.vue'

const limiters = ref([])
const peekName = ref('')
const peekKey = ref('')
const peekResult = ref(null)
const peekError = ref(null)

onMounted(async () => {
  const res = await fetch(api('/limits'))
  if (res.ok) {
    const data = await res.json()
    limiters.value = data.limiters
    if (data.limiters.length) peekName.value = data.limiters[0]
  }
})

async function peek() {
  if (!peekName.value || !peekKey.value) return
  peekError.value = null
  peekResult.value = null

  const res = await fetch(api(`/limits/${peekName.value}/peek/${encodeURIComponent(peekKey.value)}`))
  if (res.ok) {
    peekResult.value = await res.json()
  } else {
    const data = await res.json()
    peekError.value = data.error
  }
}
</script>

<template>
  <div>
    <div class="section-title">registered limiters</div>
    <div class="limiter-list" v-if="limiters.length">
      <div v-for="name in limiters" :key="name" class="tag accent" style="padding: 6px 14px; font-size: 11px;">{{ name }}</div>
    </div>
    <p v-else class="empty" style="text-align: left; padding: 0;">no limiters registered</p>

    <section v-if="limiters.length">
      <div class="section-title">peek</div>
      <p class="desc">inspect a key without consuming</p>
      <form @submit.prevent="peek" class="peek-form">
        <select v-model="peekName" class="select">
          <option v-for="name in limiters" :key="name" :value="name">{{ name }}</option>
        </select>
        <input v-model="peekKey" placeholder="key" class="input" />
        <button type="submit" :disabled="!peekKey" class="btn">peek</button>
      </form>

      <div v-if="peekResult" class="card" style="margin-top: 12px;">
        <div class="card-body">
          <JsonView :data="peekResult" />
        </div>
      </div>
      <p v-if="peekError" class="error">{{ peekError }}</p>
    </section>
  </div>
</template>

<style scoped>
.limiter-list { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }

section { margin-top: 24px; }

.desc { font-size: 11px; color: var(--text-muted); margin-bottom: 12px; }

.peek-form { display: flex; gap: 8px; }
.input { padding: 6px 10px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; font-size: 11px; color: var(--text); flex: 1; font-family: inherit; outline: none; }
.input::placeholder { color: #333; }
.input:focus { border-color: var(--accent); }
.btn { padding: 6px 16px; background: var(--bg-raised); color: #999; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; font-size: 11px; font-family: inherit; }
.btn:hover { color: var(--text); }
.btn:disabled { opacity: 0.3; cursor: default; }

.error { margin-top: 10px; color: var(--color-red); font-size: 11px; }
</style>
