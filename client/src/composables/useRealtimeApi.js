import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'

export function useRealtimeApi(pollInterval = 1000) {
  const state = ref(null)
  const connectionDetail = ref(null)
  const selectedConnectionId = ref(null)
  const error = ref(null)
  const watchedRecords = reactive({})
  const channelMessages = reactive({})
  const primedChannels = new Set()
  const channelBufferSize = 100
  let messageSeq = 0
  let timer = null
  let sseSource = null

  function appendChannelMessage(channel, entry) {
    let buf = channelMessages[channel]
    if (!buf) { buf = []; channelMessages[channel] = buf }
    buf.push({ ...entry, seq: ++messageSeq })
    if (buf.length > channelBufferSize) buf.splice(0, buf.length - channelBufferSize)
  }

  async function loadChannelMessages(channel) {
    try {
      const res = await fetch(api(`/realtime/channel/${encodeURIComponent(channel)}/messages`))
      if (!res.ok) throw new Error(`${res.status}`)
      const result = await res.json()
      channelMessages[channel] = (result.messages ?? []).map((m) => ({ ...m, seq: ++messageSeq }))
    } catch {
      if (!channelMessages[channel]) channelMessages[channel] = []
    }
  }

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
    if (state.value?.channels) {
      for (const channel of Object.keys(state.value.channels)) {
        if (!primedChannels.has(channel)) {
          primedChannels.add(channel)
          loadChannelMessages(channel)
        }
      }
    }
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

    sseSource.addEventListener('realtime:channel:message', (e) => {
      const { channel, payload, instanceId, timestamp } = JSON.parse(e.data)
      appendChannelMessage(channel, { channel, payload, instanceId, timestamp })
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
    channelMessages,
  }
}
