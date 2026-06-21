<script setup>
import { ref, computed } from "vue"
import { useFloating, autoUpdate, offset, flip, shift, arrow } from "@floating-ui/vue"

const props = defineProps({
  text: { type: String, default: "" },
  placement: { type: String, default: "top" },
  delay: { type: Number, default: 200 },
  disabled: { type: Boolean, default: false },
})

const triggerRef = ref(null)
const floatingRef = ref(null)
const arrowRef = ref(null)
const open = ref(false)
let showTimer = null
let hideTimer = null

const { floatingStyles, middlewareData, placement, isPositioned } = useFloating(triggerRef, floatingRef, {
  placement: computed(() => props.placement),
  whileElementsMounted: autoUpdate,
  middleware: [offset(8), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
})

const show = () => {
  if (props.disabled) return
  clearTimeout(hideTimer)
  showTimer = setTimeout(() => { open.value = true }, props.delay)
}
const hide = () => {
  clearTimeout(showTimer)
  hideTimer = setTimeout(() => { open.value = false }, 80)
}

const arrowSide = computed(() => placement.value.split("-")[0])
const arrowStyle = computed(() => {
  const d = middlewareData.value.arrow
  if (!d) return {}
  const sideMap = { top: "bottom", bottom: "top", left: "right", right: "left" }
  return {
    left: d.x != null ? `${d.x}px` : "",
    top: d.y != null ? `${d.y}px` : "",
    [sideMap[arrowSide.value]]: "-4px",
  }
})
</script>

<template>
  <span
    ref="triggerRef"
    class="pc-tooltip-trigger"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
  </span>
  <Teleport to="body">
    <Transition name="pc-tooltip">
      <div
        v-if="open && !disabled && (text || $slots.content)"
        ref="floatingRef"
        :class="['pc-tooltip', { 'pc-tooltip--ready': isPositioned }]"
        role="tooltip"
        :style="floatingStyles"
      >
        <slot name="content">{{ text }}</slot>
        <div ref="arrowRef" class="pc-tooltip__arrow" :style="arrowStyle" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pc-tooltip-trigger {
  display: inline-flex;
  width: max-content;
  justify-self: start;
  align-self: start;
}
.pc-tooltip {
  position: absolute;
  /* above drawer and modal overlays (9500) since a tooltip can be triggered from
     inside one, but below toasts (10000) */
  z-index: 9800;
  background: var(--midnight);
  color: var(--paper-on-dark);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: var(--radius-sharp);
  pointer-events: none;
  white-space: nowrap;
  letter-spacing: -0.12px;
  font-family: var(--display);
  box-shadow: var(--shadow-soft);
  opacity: 0;
  visibility: hidden;
}
.pc-tooltip--ready {
  visibility: visible;
  animation: pc-tooltip-in 120ms ease-out forwards;
}
/* exit - distinct keyframe so the leave animation actually restarts */
.pc-tooltip-leave-active.pc-tooltip--ready {
  animation: pc-tooltip-out 100ms ease-in forwards;
}
@keyframes pc-tooltip-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes pc-tooltip-out { from { opacity: 1; } to { opacity: 0; } }
.pc-tooltip__arrow {
  position: absolute;
  width: 8px; height: 8px;
  background: var(--midnight);
  rotate: 45deg;
}
</style>
