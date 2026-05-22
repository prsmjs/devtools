import { reactive } from "vue"

let nextId = 0
export const toasts = reactive([])

// auto-dismiss timer state, kept out of the reactive toast objects.
// id -> { handle, remaining, startedAt }
const timers = new Map()

function startTimer(id) {
  const s = timers.get(id)
  if (!s) return
  s.startedAt = Date.now()
  s.handle = setTimeout(() => dismissToast(id), s.remaining)
}

/**
 * toast(opts) - push a notification onto the queue.
 *
 * opts:
 *   variant?    'info' | 'success' | 'warning' | 'danger' | 'neutral'  (default: 'neutral')
 *   eyebrow?    string  short mono label shown above the title
 *   title?      string  the headline
 *   description? string body text
 *   duration?   number  ms before auto-dismiss; 0 means sticky (default: 4000)
 *   action?     { label: string, onClick: () => void }
 *
 * returns the toast id.
 */
export function toast(opts) {
  const t = {
    id: ++nextId,
    variant: "neutral",
    duration: 4000,
    ...opts,
  }
  toasts.push(t)
  if (t.duration > 0) {
    timers.set(t.id, { handle: null, remaining: t.duration, startedAt: 0 })
    startTimer(t.id)
  }
  return t.id
}

toast.info = (title, opts = {}) => toast({ ...opts, title, variant: "info" })
toast.success = (title, opts = {}) => toast({ ...opts, title, variant: "success" })
toast.warning = (title, opts = {}) => toast({ ...opts, title, variant: "warning" })
toast.error = (title, opts = {}) => toast({ ...opts, title, variant: "danger" })

// pause the auto-dismiss countdown (e.g. while the pointer is over the toast)
export function pauseToast(id) {
  const s = timers.get(id)
  if (!s || !s.handle) return
  clearTimeout(s.handle)
  s.handle = null
  s.remaining -= Date.now() - s.startedAt
}

// resume the countdown with whatever time was left
export function resumeToast(id) {
  const s = timers.get(id)
  if (!s || s.handle) return
  if (s.remaining <= 0) { dismissToast(id); return }
  startTimer(id)
}

export function dismissToast(id) {
  const s = timers.get(id)
  if (s) {
    clearTimeout(s.handle)
    timers.delete(id)
  }
  const i = toasts.findIndex(t => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

export function clearToasts() {
  timers.forEach(s => clearTimeout(s.handle))
  timers.clear()
  toasts.splice(0, toasts.length)
}
