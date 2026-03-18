import { ref, onMounted, onUnmounted } from 'vue'
import { api } from './api.js'

export function useSSE() {
  const events = ref([])
  let source = null

  onMounted(() => {
    source = new EventSource(api('/events'))

    for (const type of [
      'queue:new', 'queue:complete', 'queue:retry', 'queue:failed', 'queue:drain',
      'cron:fire', 'cron:error',
      'workflow:execution:queued', 'workflow:execution:succeeded', 'workflow:execution:failed',
      'workflow:execution:canceled', 'workflow:execution:lease-lost',
      'workflow:step:started', 'workflow:step:succeeded', 'workflow:step:routed',
      'workflow:step:retry', 'workflow:step:failed',
    ]) {
      source.addEventListener(type, (e) => {
        const data = JSON.parse(e.data)
        events.value.unshift({ type, data, ts: Date.now() })
        if (events.value.length > 400) events.value.length = 400
      })
    }
  })

  onUnmounted(() => {
    if (source) source.close()
  })

  return events
}
