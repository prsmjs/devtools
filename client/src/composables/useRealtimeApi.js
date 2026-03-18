import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'

export function useRealtimeApi(pollInterval = 1000) {
  const state = ref(null)
  const connectionDetail = ref(null)
  const selectedConnectionId = ref(null)
  const error = ref(null)
  const watchedRecords = reactive({})
  let timer = null
  let sseSource = null

  async function fetchState() {
    try {
      const res = await fetch(api('/realtime/state'))
      if (!res.ok) throw new Error(`${res.status}`)
      state.value = await res.json()
      error.value = null
    } catch (e) {
      error.value = e.message
    }
  }

  async function fetchConnectionDetail(id) {
    try {
      const res = await fetch(api(`/realtime/connection/${id}`))
      if (!res.ok) throw new Error(`${res.status}`)
      connectionDetail.value = await res.json()
    } catch {}
  }

  async function watchRecord(recordId) {
    try {
      const res = await fetch(api(`/realtime/record/${encodeURIComponent(recordId)}`))
      if (!res.ok) throw new Error(`${res.status}`)
      const result = await res.json()
      watchedRecords[recordId] = result.data
    } catch {
      watchedRecords[recordId] = null
    }
  }

  function unwatchRecord(recordId) {
    delete watchedRecords[recordId]
  }

  async function fetchCollectionRecords(collId, connId) {
    try {
      const res = await fetch(api(`/realtime/collection/${encodeURIComponent(collId)}/records?connId=${encodeURIComponent(connId)}`))
      if (!res.ok) throw new Error(`${res.status}`)
      return await res.json()
    } catch {
      return { recordIds: [], records: [] }
    }
  }

  async function selectConnection(id) {
    selectedConnectionId.value = id
    if (id) await fetchConnectionDetail(id)
    else connectionDetail.value = null
  }

  async function poll() {
    await fetchState()
    if (selectedConnectionId.value) {
      await fetchConnectionDetail(selectedConnectionId.value)
    }
  }

  onMounted(() => {
    poll()
    timer = setInterval(poll, pollInterval)

    sseSource = new EventSource(api('/events'))

    sseSource.addEventListener('realtime:record:update', (e) => {
      const { recordId, data } = JSON.parse(e.data)
      if (recordId in watchedRecords) {
        watchedRecords[recordId] = data
      }
    })

    sseSource.addEventListener('realtime:record:removed', (e) => {
      const { recordId } = JSON.parse(e.data)
      if (recordId in watchedRecords) {
        watchedRecords[recordId] = null
      }
    })
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    if (sseSource) sseSource.close()
  })

  return {
    state,
    connectionDetail,
    selectedConnectionId,
    error,
    selectConnection,
    watchedRecords,
    watchRecord,
    unwatchRecord,
    fetchCollectionRecords,
  }
}
