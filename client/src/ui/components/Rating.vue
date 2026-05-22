<script setup>
import { ref, computed } from "vue"

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  max: { type: Number, default: 5 },
  allowHalf: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  size: { type: String, default: "md" }, // sm | md | lg
})
const emit = defineEmits(["update:modelValue"])

const hover = ref(null)
const interactive = computed(() => !props.readonly && !props.disabled)
// the value being shown right now (hover preview wins while hovering)
const shown = computed(() => hover.value ?? props.modelValue)

// fill fraction for star i (1-indexed): 0 empty, 0.5 half, 1 full
const fillOf = (i) => Math.max(0, Math.min(1, shown.value - (i - 1)))

const valueAt = (i, e) => {
  if (!props.allowHalf) return i
  const r = e.currentTarget.getBoundingClientRect()
  return e.clientX - r.left < r.width / 2 ? i - 0.5 : i
}
const onMove = (i, e) => { if (interactive.value) hover.value = valueAt(i, e) }
const onLeave = () => { hover.value = null }
const onClick = (i, e) => {
  if (!interactive.value) return
  const v = valueAt(i, e)
  emit("update:modelValue", props.modelValue === v ? 0 : v)
}
</script>

<template>
  <div
    :class="['pc-rating', `pc-rating--${size}`, { 'pc-rating--interactive': interactive, 'pc-rating--disabled': disabled }]"
    role="slider"
    :aria-valuenow="modelValue"
    :aria-valuemin="0"
    :aria-valuemax="max"
    @mouseleave="onLeave"
  >
    <button
      v-for="i in max"
      :key="i"
      type="button"
      class="pc-rating__star"
      :disabled="!interactive"
      :aria-label="`${i} of ${max}`"
      @mousemove="onMove(i, $event)"
      @click="onClick(i, $event)"
    >
      <span class="pc-rating__glyph pc-rating__glyph--empty">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L3.5 9.4l6.6-.9z"
            stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="pc-rating__glyph pc-rating__glyph--full" :style="{ width: `${fillOf(i) * 100}%` }">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L3.5 9.4l6.6-.9z"/>
        </svg>
      </span>
    </button>
  </div>
</template>

<style scoped>
.pc-rating {
  display: inline-flex;
  gap: 2px;
  width: max-content;
}
.pc-rating__star {
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-20);
  outline: none;
  line-height: 0;
}
.pc-rating--interactive .pc-rating__star { cursor: pointer; }
.pc-rating__star:focus-visible { box-shadow: var(--focus-ring); border-radius: 3px; }

.pc-rating--sm .pc-rating__star { width: 16px; height: 16px; }
.pc-rating--md .pc-rating__star { width: 22px; height: 22px; }
.pc-rating--lg .pc-rating__star { width: 30px; height: 30px; }

.pc-rating__glyph {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.pc-rating__glyph svg { display: block; }
/* the empty (outline) layer underneath sizes the star */
.pc-rating__glyph--empty { position: static; color: var(--ink-20); }
.pc-rating__glyph--empty svg { width: 100%; height: 100%; }
/* the filled layer is clipped by width to reveal a partial / half star -
   the svg stays full star-size so the clip shows the left portion of a
   real star, not a shrunken one */
.pc-rating__glyph--full {
  color: var(--status-warning);
  transition: width 100ms ease;
}
.pc-rating__glyph--full svg { height: 100%; width: auto; max-width: none; }
.pc-rating--disabled { opacity: 0.5; }
.pc-rating--disabled .pc-rating__glyph--full { color: var(--ink-40); }
</style>
