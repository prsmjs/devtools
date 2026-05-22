<script setup>
import { computed } from "vue"

const props = defineProps({
  variant: { type: String, default: "rect" }, // rect | text | circle
  width: { type: [String, Number], default: null },
  height: { type: [String, Number], default: null },
  size: { type: [String, Number], default: null }, // shorthand for circle (w + h)
  lines: { type: Number, default: 1 }, // for variant=text, render N stacked lines
  radius: { type: [String, Number], default: null },
  animation: { type: String, default: "shimmer" }, // shimmer | pulse | none
})

const toCss = (v) => typeof v === "number" ? `${v}px` : v

const baseStyle = computed(() => {
  const s = {}
  if (props.size != null && props.variant === "circle") {
    s.width = toCss(props.size)
    s.height = toCss(props.size)
  } else {
    if (props.width != null) s.width = toCss(props.width)
    if (props.height != null) s.height = toCss(props.height)
  }
  if (props.radius != null) s.borderRadius = toCss(props.radius)
  return s
})
</script>

<template>
  <span
    v-if="variant === 'text' && lines > 1"
    class="pc-skel-stack"
  >
    <span
      v-for="i in lines"
      :key="i"
      :class="['pc-skel', `pc-skel--text`, `pc-skel--${animation}`]"
      :style="i === lines ? { ...baseStyle, width: '60%' } : baseStyle"
    />
  </span>
  <span
    v-else
    :class="['pc-skel', `pc-skel--${variant}`, `pc-skel--${animation}`]"
    :style="baseStyle"
    aria-hidden="true"
  />
</template>

<style scoped>
.pc-skel {
  display: block;
  background-color: var(--ink-04);
  border-radius: var(--radius-sharp);
  position: relative;
  overflow: hidden;
}
.pc-skel--text {
  height: 12px;
  width: 100%;
  border-radius: 3px;
  margin: 4px 0;
}
.pc-skel--circle {
  border-radius: 999px;
  width: 32px;
  height: 32px;
}
.pc-skel--rect {
  width: 100%;
  height: 80px;
}

/* shimmer - sweep a soft highlight across the surface */
.pc-skel--shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.55) 50%,
    transparent 100%
  );
  animation: pc-skel-shimmer 1400ms ease-in-out infinite;
  transform: translateX(-100%);
}
@keyframes pc-skel-shimmer {
  to { transform: translateX(100%); }
}

.pc-skel--pulse { animation: pc-skel-pulse 1400ms ease-in-out infinite; }
@keyframes pc-skel-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.pc-skel-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
</style>
