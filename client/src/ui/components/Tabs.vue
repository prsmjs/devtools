<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue"

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  tabs: { type: Array, required: true }, // [{ value, label, badge?, disabled? }]
  variant: { type: String, default: "underline" }, // underline | pills
  size: { type: String, default: "md" }, // sm | md
})
const emit = defineEmits(["update:modelValue"])

const rootRef = ref(null)
const indicatorStyle = ref({ opacity: 0 })
// only enable the slide transition after the first positioning, so the
// indicator doesn't animate in from the left on mount
const animate = ref(false)

const activeIndex = computed(() => props.tabs.findIndex(t => t.value === props.modelValue))

const updateIndicator = () => {
  const root = rootRef.value
  if (!root) return
  const el = root.querySelectorAll(".pc-tab")[activeIndex.value]
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
  () => [props.modelValue, props.variant, props.size, props.tabs.length],
  () => nextTick(updateIndicator),
)
</script>

<template>
  <div ref="rootRef" :class="['pc-tabs', `pc-tabs--${variant}`, `pc-tabs--${size}`]" role="tablist">
    <span
      class="pc-tabs__indicator"
      :class="{ 'pc-tabs__indicator--animate': animate }"
      :style="indicatorStyle"
    />
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      :disabled="tab.disabled"
      :class="['pc-tab', { 'pc-tab--active': modelValue === tab.value, 'pc-tab--disabled': tab.disabled }]"
      @click="!tab.disabled && emit('update:modelValue', tab.value)"
    >
      <span>{{ tab.label }}</span>
      <span v-if="tab.badge != null" class="pc-tab__badge">{{ tab.badge }}</span>
    </button>
  </div>
</template>

<style scoped>
.pc-tabs { display: inline-flex; align-items: center; gap: 4px; position: relative; }
.pc-tabs--underline { border-bottom: 1px solid var(--ink-08); gap: 0; }

/* the sliding active indicator */
.pc-tabs__indicator {
  position: absolute;
  left: 0;
  opacity: 0;
  pointer-events: none;
}
.pc-tabs__indicator--animate {
  transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1),
              width 260ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 160ms ease;
}
.pc-tabs--underline .pc-tabs__indicator {
  bottom: -1px;
  height: 2px;
  background: var(--midnight);
}
.pc-tabs--pills .pc-tabs__indicator {
  top: 3px;
  bottom: 3px;
  background: var(--paper);
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px var(--ink-08);
}

.pc-tab {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-family: var(--display);
  font-size: 14px;
  letter-spacing: -0.14px;
  font-weight: 500;
  color: var(--ink-60);
  border-radius: var(--radius-sharp);
  transition: color 140ms ease, background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  line-height: 1.2;
  white-space: nowrap;
  outline: none;
}
.pc-tab:hover:not(:disabled) { color: var(--ink); }
.pc-tab:focus-visible:not(:disabled) { box-shadow: var(--focus-ring); }
.pc-tab--active { color: var(--ink); }
.pc-tab--disabled { opacity: 0.5; cursor: not-allowed; }

/* underline variant */
.pc-tabs--underline .pc-tab {
  border-radius: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: 8px 12px 10px;
}
.pc-tabs--underline .pc-tab:hover:not(:disabled):not(.pc-tab--active) {
  border-bottom-color: var(--ink-20);
}

/* pills variant */
.pc-tabs--pills {
  background: var(--ink-08);
  padding: 3px;
  border-radius: var(--radius-sharp);
}
.pc-tabs--pills .pc-tab { padding: 5px 12px; color: var(--ink-60); }
.pc-tabs--pills .pc-tab:hover:not(.pc-tab--active) { color: var(--ink); }
.pc-tabs--pills .pc-tab--active { color: var(--ink); }

.pc-tabs--sm .pc-tab { font-size: 13px; padding: 5px 10px; }

.pc-tab__badge {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  background: var(--ink-04);
  border: 1px solid var(--ink-08);
  border-radius: 3px;
  padding: 0 5px;
  color: var(--ink-60);
}
.pc-tabs--pills .pc-tab__badge {
  background: var(--paper);
  border-color: var(--ink-08);
}
.pc-tabs--underline .pc-tab--active .pc-tab__badge { color: var(--ink); }

@media (prefers-reduced-motion: reduce) {
  .pc-tabs__indicator--animate { transition: opacity 120ms ease; }
}
</style>
