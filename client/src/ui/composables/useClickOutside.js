import { onBeforeUnmount, onMounted, unref } from "vue"

export function useClickOutside(refs, handler) {
  const list = Array.isArray(refs) ? refs : [refs]

  const onPointer = (e) => {
    const target = e.target
    for (const r of list) {
      const el = unref(r)
      const node = el?.$el ?? el
      if (node && node.contains && node.contains(target)) return
    }
    handler(e)
  }

  onMounted(() => {
    document.addEventListener("pointerdown", onPointer, true)
  })
  onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", onPointer, true)
  })
}
