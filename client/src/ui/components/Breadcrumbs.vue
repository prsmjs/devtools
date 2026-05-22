<script setup>
import { computed } from "vue"

const props = defineProps({
  // items: [{ label, to?, icon? }] - last item is treated as the current page
  items: { type: Array, required: true },
  separator: { type: String, default: "/" }, // "/" | ">" | "›" | custom
  // collapse middle when more than this many items, showing "…" between first and last
  maxItems: { type: Number, default: 0 },
})
const emit = defineEmits(["select"])

const visible = computed(() => {
  if (!props.maxItems || props.items.length <= props.maxItems) {
    return props.items.map(i => ({ ...i, _kind: "item" }))
  }
  const first = props.items[0]
  const last = props.items.slice(-(props.maxItems - 2))
  return [
    { ...first, _kind: "item" },
    { _kind: "ellipsis", hidden: props.items.slice(1, -(props.maxItems - 2)) },
    ...last.map(i => ({ ...i, _kind: "item" })),
  ]
})

const onClick = (item, isLast, e) => {
  if (isLast) return
  if (!item.to) {
    e.preventDefault()
    emit("select", item)
  }
}
</script>

<template>
  <nav class="pc-crumbs" aria-label="Breadcrumb">
    <ol class="pc-crumbs__list">
      <template v-for="(node, i) in visible" :key="i">
        <li v-if="node._kind === 'ellipsis'" class="pc-crumbs__item pc-crumbs__item--ellipsis" aria-hidden="true">
          <span class="pc-crumbs__ellipsis">…</span>
        </li>
        <li
          v-else
          :class="['pc-crumbs__item', { 'pc-crumbs__item--current': i === visible.length - 1 }]"
        >
          <component
            :is="node.to && i !== visible.length - 1 ? 'a' : 'span'"
            :href="node.to"
            :class="['pc-crumbs__link', { 'pc-crumbs__link--current': i === visible.length - 1 }]"
            :aria-current="i === visible.length - 1 ? 'page' : undefined"
            @click="onClick(node, i === visible.length - 1, $event)"
          >
            <span v-if="node.icon" class="pc-crumbs__icon">
              <slot name="icon" :item="node">{{ node.icon }}</slot>
            </span>
            <span>{{ node.label }}</span>
          </component>
        </li>
        <li
          v-if="i < visible.length - 1"
          class="pc-crumbs__sep"
          aria-hidden="true"
        ><slot name="separator">{{ separator }}</slot></li>
      </template>
    </ol>
  </nav>
</template>

<style scoped>
.pc-crumbs { display: inline-flex; }
.pc-crumbs__list {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--display);
  font-size: 13px;
  letter-spacing: -0.13px;
  line-height: 1.4;
}
.pc-crumbs__item { display: inline-flex; align-items: center; min-width: 0; }
.pc-crumbs__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-60);
  text-decoration: none;
  padding: 2px 4px;
  border-radius: 3px;
  outline: none;
  transition: color 140ms ease, background 140ms ease, box-shadow 140ms ease;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.pc-crumbs__link:hover:not(.pc-crumbs__link--current) { color: var(--ink); background: var(--ink-04); }
.pc-crumbs__link:focus-visible { box-shadow: var(--focus-ring); }
.pc-crumbs__link--current {
  color: var(--ink);
  font-weight: 500;
  cursor: default;
}
.pc-crumbs__icon {
  display: inline-flex;
  align-items: center;
  opacity: 0.8;
}
.pc-crumbs__sep {
  display: inline-flex;
  align-items: center;
  color: var(--ink-20);
  font-size: 15px;
  line-height: 1;
  user-select: none;
}
.pc-crumbs__ellipsis {
  color: var(--ink-40);
  padding: 0 4px;
  letter-spacing: 0.05em;
}
</style>
