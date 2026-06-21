<script>
export default { name: "Tree" }
</script>

<script setup>
import { computed } from "vue"

const props = defineProps({
  // items: [{ key, label, icon?, children?, disabled? }]
  items: { type: Array, required: true },
  expanded: { type: Array, default: () => [] },
  selected: { type: [String, Number, null], default: null },
  level: { type: Number, default: 0 },
})
const emit = defineEmits(["update:expanded", "update:selected", "select"])

const isExpanded = (key) => props.expanded.includes(key)
const toggleExpand = (key, e) => {
  e?.stopPropagation()
  const next = isExpanded(key)
    ? props.expanded.filter(k => k !== key)
    : [...props.expanded, key]
  emit("update:expanded", next)
}
const onSelect = (item) => {
  if (item.disabled) return
  emit("update:selected", item.key)
  emit("select", item)
}

const indent = computed(() => props.level * 16)

// expand/collapse height animation - children stagger in via CSS
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

const animateHeight = (el, from, to, done) => {
  el.style.overflow = "hidden"
  el.style.height = from
  void el.offsetHeight
  el.style.transition = "height 220ms cubic-bezier(0.22, 1, 0.36, 1)"
  el.style.height = to
  const end = (e) => {
    if (e.propertyName !== "height") return
    el.removeEventListener("transitionend", end)
    done()
  }
  el.addEventListener("transitionend", end)
}
const onExpand = (el, done) => {
  if (reducedMotion()) return done()
  animateHeight(el, "0px", `${el.scrollHeight}px`, done)
}
const onExpanded = (el) => {
  el.style.height = ""
  el.style.overflow = ""
  el.style.transition = ""
}
const onCollapse = (el, done) => {
  if (reducedMotion()) return done()
  animateHeight(el, `${el.scrollHeight}px`, "0px", done)
}
const onCollapsed = onExpanded
</script>

<template>
  <ul class="pc-tree" :class="{ 'pc-tree--nested': level > 0 }" role="tree">
    <li
      v-for="(item, i) in items"
      :key="item.key"
      role="treeitem"
      :aria-expanded="item.children ? isExpanded(item.key) : undefined"
      :style="{ '--pc-tree-stagger': `${Math.min(i, 10) * 28}ms` }"
    >
      <div
        :class="[
          'pc-tree__node',
          {
            'pc-tree__node--selected': selected === item.key,
            'pc-tree__node--disabled': item.disabled,
            'pc-tree__node--leaf': !item.children?.length,
          }
        ]"
        :style="{ paddingLeft: `${indent + 8}px` }"
        :tabindex="item.disabled ? -1 : 0"
        @click="onSelect(item)"
        @keydown.enter.prevent="onSelect(item)"
        @keydown.space.prevent="onSelect(item)"
      >
        <button
          v-if="item.children?.length"
          type="button"
          class="pc-tree__toggle"
          :aria-label="isExpanded(item.key) ? 'Collapse' : 'Expand'"
          @click="toggleExpand(item.key, $event)"
        >
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            :class="['pc-tree__chevron', { 'pc-tree__chevron--open': isExpanded(item.key) }]"
          >
            <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span v-else class="pc-tree__toggle pc-tree__toggle--placeholder" aria-hidden="true" />
        <slot name="icon" :item="item">
          <span v-if="item.icon" class="pc-tree__icon">{{ item.icon }}</span>
        </slot>
        <span class="pc-tree__label">
          <slot name="label" :item="item">{{ item.label }}</slot>
        </span>
        <span v-if="item.badge != null && item.badge !== 0" class="pc-tree__badge">{{ item.badge }}</span>
      </div>
      <Transition
        :css="false"
        @enter="onExpand"
        @after-enter="onExpanded"
        @leave="onCollapse"
        @after-leave="onCollapsed"
      >
        <Tree
          v-if="item.children?.length && isExpanded(item.key)"
          :items="item.children"
          :expanded="expanded"
          :selected="selected"
          :level="level + 1"
          @update:expanded="v => emit('update:expanded', v)"
          @update:selected="v => emit('update:selected', v)"
          @select="i => emit('select', i)"
        >
          <template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template>
          <template v-if="$slots.label" #label="slotProps"><slot name="label" v-bind="slotProps" /></template>
        </Tree>
      </Transition>
    </li>
  </ul>
</template>

<style scoped>
.pc-tree { list-style: none; padding: 0; margin: 0; }
.pc-tree--nested { margin: 0; }

/* nested rows fade+slide in with a subtle per-row stagger when expanding */
.pc-tree--nested > li {
  opacity: 0;
  translate: -4px 0;
  animation: pc-tree-row-in 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--pc-tree-stagger, 0ms);
}
@keyframes pc-tree-row-in {
  to { opacity: 1; translate: 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  .pc-tree--nested > li {
    animation: none;
    opacity: 1;
    translate: 0 0;
  }
}
.pc-tree__node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 8px;
  border-radius: var(--radius-sharp);
  font-family: var(--display);
  font-size: 14px;
  letter-spacing: -0.14px;
  color: var(--ink);
  cursor: pointer;
  outline: none;
  transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease;
  user-select: none;
}
.pc-tree__node:hover:not(.pc-tree__node--selected):not(.pc-tree__node--disabled) { background: var(--ink-04); }
.pc-tree__node:focus-visible { box-shadow: var(--focus-ring); }
.pc-tree__node--selected {
  background: var(--midnight);
  color: var(--paper-on-dark);
}
.pc-tree__node--selected:hover { background: var(--midnight-hover); }
.pc-tree__node--disabled { color: var(--ink-40); cursor: not-allowed; }
.pc-tree__node--leaf .pc-tree__toggle { visibility: hidden; }

.pc-tree__toggle {
  width: 18px; height: 18px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--ink-60);
  background: transparent;
  outline: none;
  transition: background 120ms ease, color 120ms ease;
}
.pc-tree__node--selected .pc-tree__toggle { color: var(--paper-on-dark-60); }
.pc-tree__toggle:hover:not(.pc-tree__toggle--placeholder) { background: var(--ink-08); color: var(--ink); }
.pc-tree__node--selected .pc-tree__toggle:hover { background: rgba(255,255,255,0.15); color: var(--paper-on-dark); }
.pc-tree__toggle--placeholder { pointer-events: none; }

.pc-tree__chevron {
  transition: rotate 140ms ease;
}
.pc-tree__chevron--open { rotate: 90deg; }

.pc-tree__icon {
  width: 16px; height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  opacity: 0.7;
}
.pc-tree__node--selected .pc-tree__icon { opacity: 1; }

.pc-tree__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-tree__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--badge-radius);
  background: var(--ink-08);
  color: var(--ink-60);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 500;
}
.pc-tree__node--selected .pc-tree__badge {
  background: rgba(255, 255, 255, 0.15);
  color: var(--paper-on-dark);
}
</style>
