<script setup>
import { ref, computed, onBeforeUnmount } from "vue"
import {
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaCorner,
} from "reka-ui"

const props = defineProps({
  height: { type: [String, Number], default: null },
  maxHeight: { type: [String, Number], default: null },
  // ms of pointer inactivity before the scrollbar fades while still inside
  idleMs: { type: Number, default: 1500 },
  // keep the scrollbar visible at all times (skips the hover / idle / leave fade)
  always: { type: Boolean, default: false },
})

// scrollbar visibility: wakes on enter / move / scroll, sleeps on idle or leave
const active = ref(false)
let idleTimer = null

const wake = () => {
  active.value = true
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { active.value = false }, props.idleMs)
}
const sleep = () => {
  clearTimeout(idleTimer)
  active.value = false
}
onBeforeUnmount(() => clearTimeout(idleTimer))

const toCss = (v) => v == null ? undefined : (typeof v === "number" ? `${v}px` : v)
const viewportStyle = computed(() => ({
  height: toCss(props.height),
  maxHeight: toCss(props.maxHeight),
}))
</script>

<template>
  <ScrollAreaRoot
    class="pc-scrollarea"
    :class="{ 'pc-scrollarea--show': always || active }"
    type="auto"
    @pointerenter="wake"
    @pointermove="wake"
    @pointerleave="sleep"
    @wheel="wake"
  >
    <ScrollAreaViewport
      class="pc-scrollarea__viewport"
      :style="viewportStyle"
      @scroll="wake"
    >
      <slot />
    </ScrollAreaViewport>

    <ScrollAreaScrollbar class="pc-scrollarea__bar" orientation="vertical">
      <ScrollAreaThumb class="pc-scrollarea__thumb" />
    </ScrollAreaScrollbar>
    <ScrollAreaScrollbar class="pc-scrollarea__bar" orientation="horizontal">
      <ScrollAreaThumb class="pc-scrollarea__thumb" />
    </ScrollAreaScrollbar>
    <ScrollAreaCorner class="pc-scrollarea__corner" />
  </ScrollAreaRoot>
</template>

<style scoped>
.pc-scrollarea {
  position: relative;
  overflow: hidden;
}
.pc-scrollarea__viewport {
  width: 100%;
}

/* the scrollbar is overlaid - it never reserves layout space, and the track
   is fully transparent so it can't clash with the surface underneath */
.pc-scrollarea__bar {
  display: flex;
  user-select: none;
  touch-action: none;
  padding: 3px;
  background: transparent;
  opacity: 0;
  pointer-events: none;
  transition: opacity 260ms ease;
  z-index: 2;
}
.pc-scrollarea--show .pc-scrollarea__bar {
  opacity: 1;
  pointer-events: auto;
}
.pc-scrollarea__bar[data-orientation="vertical"] { width: 11px; }
.pc-scrollarea__bar[data-orientation="horizontal"] { flex-direction: column; height: 11px; }

.pc-scrollarea__thumb {
  flex: 1;
  position: relative;
  background: var(--ink-20);
  border-radius: 999px;
  transition: background 140ms ease;
}
.pc-scrollarea__thumb:hover,
.pc-scrollarea__thumb:active { background: var(--ink-40); }
/* enlarged invisible hit target so the thin thumb is easy to grab */
.pc-scrollarea__thumb::before {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 100%; height: 100%;
  min-width: 40px;
  min-height: 40px;
}

.pc-scrollarea__corner { background: transparent; }

@media (prefers-reduced-motion: reduce) {
  .pc-scrollarea__bar { transition: opacity 80ms ease; }
}
</style>
