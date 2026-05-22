<script setup>
import { ref, computed, watch } from "vue"
import { useFloating, autoUpdate, offset, flip, shift } from "@floating-ui/vue"
import { useClickOutside } from "../composables/useClickOutside.js"

const props = defineProps({
  modelValue: { type: Boolean, default: undefined },
  placement: { type: String, default: "bottom-start" },
  offset: { type: Number, default: 6 },
  trigger: { type: String, default: "click" }, // click | manual
  closeOnEsc: { type: Boolean, default: true },
  // full-width trigger (instead of the default content-width)
  block: { type: Boolean, default: false },
})
const emit = defineEmits(["update:modelValue", "open", "close"])

const internalOpen = ref(false)
const isControlled = computed(() => props.modelValue !== undefined)
const open = computed({
  get: () => isControlled.value ? props.modelValue : internalOpen.value,
  set: (v) => {
    if (isControlled.value) emit("update:modelValue", v)
    else internalOpen.value = v
    emit(v ? "open" : "close")
  },
})

const triggerRef = ref(null)
const floatingRef = ref(null)

const { floatingStyles, isPositioned } = useFloating(triggerRef, floatingRef, {
  placement: computed(() => props.placement),
  whileElementsMounted: autoUpdate,
  middleware: [offset(props.offset), flip(), shift({ padding: 8 })],
})

useClickOutside([triggerRef, floatingRef], () => { if (open.value) open.value = false })

const onTriggerClick = () => {
  if (props.trigger !== "click") return
  open.value = !open.value
}

watch(open, (v) => {
  if (!v) return
  const onKey = (e) => {
    if (e.key === "Escape" && props.closeOnEsc) {
      open.value = false
      document.removeEventListener("keydown", onKey)
    }
  }
  document.addEventListener("keydown", onKey)
})

defineExpose({ open: () => { open.value = true }, close: () => { open.value = false } })
</script>

<template>
  <span ref="triggerRef" :class="['pc-pop-trigger', { 'pc-pop-trigger--block': block }]" @click="onTriggerClick">
    <slot name="trigger" :open="open" />
  </span>
  <Teleport to="body">
    <Transition name="pc-pop">
      <div
        v-if="open"
        ref="floatingRef"
        :class="['pc-pop', { 'pc-pop--ready': isPositioned }]"
        :style="floatingStyles"
      >
        <slot :close="() => { open = false }" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pc-pop-trigger {
  display: inline-flex;
  width: max-content;
  justify-self: start;
  align-self: start;
}
.pc-pop-trigger--block { display: block; width: 100%; }
.pc-pop {
  position: absolute;
  z-index: 8000;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  box-shadow: var(--shadow-medium);
  padding: 12px;
  min-width: 180px;
  font-size: 14px;
  color: var(--ink);
  opacity: 0;
  visibility: hidden;
}
.pc-pop--ready {
  visibility: visible;
  animation: pc-pop-in 140ms ease-out forwards;
}
/* exit - a distinct keyframe (reusing pc-pop-in with `reverse` won't restart a
   finished animation, so the leave needs its own named keyframe) */
.pc-pop-leave-active.pc-pop--ready {
  animation: pc-pop-out 120ms ease-in forwards;
}
/* uses `translate` (separate from `transform`) so floating-ui's transform positioning is not overridden */
@keyframes pc-pop-in {
  from { opacity: 0; translate: 0 -4px; }
  to { opacity: 1; translate: 0 0; }
}
@keyframes pc-pop-out {
  from { opacity: 1; translate: 0 0; }
  to { opacity: 0; translate: 0 -4px; }
}
</style>
