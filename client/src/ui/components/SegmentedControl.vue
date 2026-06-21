<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue"

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, required: true }, // [{ value, label, icon?, disabled? }] or [string]
  size: { type: String, default: "md" }, // sm | md
})
const emit = defineEmits(["update:modelValue"])

const normalize = (o) => (typeof o === "object" && o !== null) ? o : { value: o, label: String(o) }
const items = computed(() => props.options.map(normalize))

const rootRef = ref(null)
const indicatorStyle = ref({ opacity: 0 })
// only enable the slide transition after the first positioning, so the
// indicator doesn't animate in from the left on mount
const animate = ref(false)

const activeIndex = computed(() => items.value.findIndex(o => o.value === props.modelValue))

const updateIndicator = () => {
  const root = rootRef.value
  if (!root) return
  const el = root.querySelectorAll(".pc-seg__btn")[activeIndex.value]
  if (!el) {
    indicatorStyle.value = { opacity: 0 }
    return
  }
  indicatorStyle.value = {
    opacity: 1,
    transform: `translateX(${el.offsetLeft}px)`,
    width: `${el.offsetWidth}px`,
  }
}

let ro = null
onMounted(() => {
  nextTick(() => {
    updateIndicator()
    requestAnimationFrame(() => { animate.value = true })
  })
  ro = new ResizeObserver(() => updateIndicator())
  if (rootRef.value) ro.observe(rootRef.value)
})
onBeforeUnmount(() => ro?.disconnect())

watch(
  () => [props.modelValue, props.size, items.value.length],
  () => nextTick(updateIndicator),
)
</script>

<template>
  <div ref="rootRef" :class="['pc-seg', `pc-seg--${size}`]" role="tablist">
    <span
      class="pc-seg__indicator"
      :class="{ 'pc-seg__indicator--animate': animate }"
      :style="indicatorStyle"
    />
    <button
      v-for="opt in items"
      :key="opt.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      :disabled="opt.disabled"
      :class="['pc-seg__btn', { 'pc-seg__btn--active': modelValue === opt.value }]"
      @click="emit('update:modelValue', opt.value)"
    >
      <span v-if="opt.icon" class="pc-seg__icon">{{ opt.icon }}</span>
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.pc-seg {
  position: relative;
  display: inline-flex;
  background: var(--ink-04);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  padding: 3px;
  gap: 2px;
  height: var(--control-h);
  box-sizing: border-box;
}

/* the sliding active indicator - mirrors the Tabs pills variant */
.pc-seg__indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  background: var(--paper);
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(1, 1, 32, 0.08);
  opacity: 0;
  pointer-events: none;
}
.pc-seg__indicator--animate {
  transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1),
              width 260ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 160ms ease;
}

.pc-seg__btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 3px;
  font-family: var(--display);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.13px;
  color: var(--ink-60);
  background: transparent;
  outline: none;
  transition: color 140ms ease, box-shadow 140ms ease;
  white-space: nowrap;
  line-height: 1;
}
.pc-seg__btn:hover:not(:disabled):not(.pc-seg__btn--active) { color: var(--ink); }
.pc-seg__btn:focus-visible { box-shadow: var(--focus-ring); }
.pc-seg__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pc-seg__btn--active { color: var(--ink); }
.pc-seg--sm { height: var(--control-h-sm); padding: 2px; }
.pc-seg--sm .pc-seg__indicator { top: 2px; bottom: 2px; }
.pc-seg--sm .pc-seg__btn { padding: 0 8px; font-size: 12px; }
.pc-seg__icon { font-size: 13px; }

@media (prefers-reduced-motion: reduce) {
  .pc-seg__indicator--animate { transition: opacity 120ms ease; }
}
</style>
