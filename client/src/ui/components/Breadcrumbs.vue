<script setup>
import { computed } from "vue"
import Popover from "./Popover.vue"

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

const onHiddenClick = (item, close, e) => {
  if (!item.to) {
    e.preventDefault()
    emit("select", item)
  }
  close()
}
</script>

<template>
  <nav class="pc-crumbs" aria-label="Breadcrumb">
    <ol class="pc-crumbs__list">
      <template v-for="(node, i) in visible" :key="i">
        <li v-if="node._kind === 'ellipsis'" class="pc-crumbs__item pc-crumbs__item--ellipsis">
          <Popover placement="bottom-start" :offset="6">
            <template #trigger="{ open }">
              <button
                type="button"
                :class="['pc-crumbs__ellipsis-btn', { 'pc-crumbs__ellipsis-btn--open': open }]"
                aria-label="Show collapsed breadcrumbs"
                aria-haspopup="menu"
                :aria-expanded="open"
              >
                <span class="pc-crumbs__ellipsis">…</span>
              </button>
            </template>
            <template #default="{ close }">
              <div class="pc-crumbs__menu" role="menu">
                <component
                  :is="h.to ? 'a' : 'button'"
                  v-for="(h, hi) in node.hidden"
                  :key="hi"
                  :href="h.to || undefined"
                  :type="h.to ? undefined : 'button'"
                  class="pc-crumbs__menu-item"
                  role="menuitem"
                  @click="onHiddenClick(h, close, $event)"
                >
                  <span v-if="h.icon" class="pc-crumbs__icon">
                    <slot name="icon" :item="h">{{ h.icon }}</slot>
                  </span>
                  <span class="pc-crumbs__menu-label">{{ h.label }}</span>
                </component>
              </div>
            </template>
          </Popover>
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
  transition: color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 60ms ease;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.pc-crumbs__link:hover:not(.pc-crumbs__link--current) { color: var(--ink); background: var(--ink-04); }
.pc-crumbs__link:active:not(.pc-crumbs__link--current) { background: var(--ink-08); color: var(--ink); transform: translateY(1px); }
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

/* collapsed-items trigger - a real button that opens the menu */
.pc-crumbs__ellipsis-btn {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--ink-40);
  cursor: pointer;
  outline: none;
  transition: color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 60ms ease;
}
.pc-crumbs__ellipsis-btn:hover,
.pc-crumbs__ellipsis-btn--open { color: var(--ink); background: var(--ink-04); }
.pc-crumbs__ellipsis-btn:active { background: var(--ink-08); color: var(--ink); transform: translateY(1px); }
.pc-crumbs__ellipsis-btn:focus-visible { box-shadow: var(--focus-ring); }
.pc-crumbs__ellipsis {
  letter-spacing: 0.05em;
  line-height: 1;
}

/* dropdown menu of the collapsed crumbs - cancels the popover's 12px padding */
.pc-crumbs__menu {
  margin: -8px;
  display: flex;
  flex-direction: column;
  min-width: 160px;
}
.pc-crumbs__menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border-radius: var(--radius-sharp);
  font-family: var(--display);
  font-size: 13px;
  letter-spacing: -0.13px;
  color: var(--ink-60);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  outline: none;
  transition: color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}
.pc-crumbs__menu-item:hover { color: var(--ink); background: var(--ink-04); }
.pc-crumbs__menu-item:focus-visible { box-shadow: var(--focus-ring); }
.pc-crumbs__menu-item:active { background: var(--ink-08); }
.pc-crumbs__menu-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
