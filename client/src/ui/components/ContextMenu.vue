<script setup>
import { Icon } from "@iconify/vue"
import {
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "reka-ui"

defineProps({
  /**
   * items: [{
   *   label, icon?, value?, shortcut?, danger?, disabled?,
   *   divider?: true,
   *   items?: [...]    // nested submenu (one level supported)
   * }]
   * icon  - an iconify name, e.g. "lucide:pencil"
   * shortcut - a string or an array of key tokens, e.g. ["⌘", "E"]
   */
  items: { type: Array, required: true },
})
const emit = defineEmits(["select"])

const onSelect = (item, event) => {
  if (item.disabled) return
  emit("select", item)
}

// shortcut may be a string or an array of key tokens
const keysOf = (s) => Array.isArray(s) ? s : (s == null ? [] : [s])
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuPortal>
      <ContextMenuContent class="pc-ctxmenu" :collision-padding="8">
        <template v-for="(item, i) in items" :key="i">
          <ContextMenuSeparator v-if="item.divider" class="pc-ctxmenu__divider" />

          <ContextMenuSub v-else-if="item.items && item.items.length">
            <ContextMenuSubTrigger
              class="pc-ctxmenu__item"
              :class="{ 'pc-ctxmenu__item--disabled': item.disabled }"
              :disabled="item.disabled"
            >
              <span class="pc-ctxmenu__icon">
                <Icon v-if="item.icon" :icon="item.icon" />
              </span>
              <span class="pc-ctxmenu__label">{{ item.label }}</span>
              <Icon icon="lucide:chevron-right" class="pc-ctxmenu__chevron" aria-hidden="true" />
            </ContextMenuSubTrigger>
            <ContextMenuPortal>
              <ContextMenuSubContent class="pc-ctxmenu" :side-offset="4" :collision-padding="8">
                <template v-for="(sub, j) in item.items" :key="j">
                  <ContextMenuSeparator v-if="sub.divider" class="pc-ctxmenu__divider" />
                  <ContextMenuItem
                    v-else
                    class="pc-ctxmenu__item"
                    :class="{ 'pc-ctxmenu__item--danger': sub.danger, 'pc-ctxmenu__item--disabled': sub.disabled }"
                    :disabled="sub.disabled"
                    @select="onSelect(sub, $event)"
                  >
                    <span class="pc-ctxmenu__icon">
                      <Icon v-if="sub.icon" :icon="sub.icon" />
                    </span>
                    <span class="pc-ctxmenu__label">{{ sub.label }}</span>
                    <span v-if="sub.shortcut" class="pc-ctxmenu__shortcut">
                      <kbd v-for="(k, ki) in keysOf(sub.shortcut)" :key="ki" class="pc-ctxmenu__key">{{ k }}</kbd>
                    </span>
                  </ContextMenuItem>
                </template>
              </ContextMenuSubContent>
            </ContextMenuPortal>
          </ContextMenuSub>

          <ContextMenuItem
            v-else
            class="pc-ctxmenu__item"
            :class="{ 'pc-ctxmenu__item--danger': item.danger, 'pc-ctxmenu__item--disabled': item.disabled }"
            :disabled="item.disabled"
            @select="onSelect(item, $event)"
          >
            <span class="pc-ctxmenu__icon">
              <Icon v-if="item.icon" :icon="item.icon" />
            </span>
            <span class="pc-ctxmenu__label">{{ item.label }}</span>
            <span v-if="item.shortcut" class="pc-ctxmenu__shortcut">
              <kbd v-for="(k, ki) in keysOf(item.shortcut)" :key="ki" class="pc-ctxmenu__key">{{ k }}</kbd>
            </span>
          </ContextMenuItem>
        </template>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>

<style>
/* unscoped since reka teleports to body and our styles must reach the portal */
.pc-ctxmenu {
  z-index: 9000;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  box-shadow: var(--shadow-medium);
  padding: 4px;
  min-width: 200px;
  font-size: 14px;
  font-family: var(--display);
  letter-spacing: -0.14px;
  color: var(--ink);
  outline: none;
}
.pc-ctxmenu[data-state="open"] { animation: pc-ctxmenu-in 120ms ease-out; }
/* exit - distinct keyframe (reka defers unmount until it finishes) */
.pc-ctxmenu[data-state="closed"] { animation: pc-ctxmenu-out 110ms ease-in forwards; }
@keyframes pc-ctxmenu-in {
  from { opacity: 0; translate: 0 -4px; }
  to { opacity: 1; translate: 0 0; }
}
@keyframes pc-ctxmenu-out {
  from { opacity: 1; translate: 0 0; }
  to { opacity: 0; translate: 0 -4px; }
}
.pc-ctxmenu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: var(--radius-sharp);
  cursor: default;
  outline: none;
  user-select: none;
  color: var(--ink);
  transition: background 120ms ease;
}
.pc-ctxmenu__item[data-highlighted],
.pc-ctxmenu__item[data-state="open"] { background: var(--ink-04); }
.pc-ctxmenu__item--danger { color: var(--status-failed); }
.pc-ctxmenu__item--danger[data-highlighted] { background: var(--status-failed-bg); }
/* press feedback - a notch darker than the highlighted state */
.pc-ctxmenu__item:active { background: var(--ink-08); }
.pc-ctxmenu__item--danger:active {
  background: color-mix(in srgb, var(--status-failed) 18%, var(--paper));
}
.pc-ctxmenu__item--disabled,
.pc-ctxmenu__item[data-disabled] { color: var(--ink-40); pointer-events: none; }
.pc-ctxmenu__icon {
  width: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
  color: var(--ink-60);
}
.pc-ctxmenu__item--danger .pc-ctxmenu__icon { color: var(--status-failed); }
.pc-ctxmenu__label { flex: 1; white-space: nowrap; }

/* shortcut as small keycaps - system font so ⌘ / ⇧ render cleanly */
.pc-ctxmenu__shortcut {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}
.pc-ctxmenu__key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 3px;
  background: var(--ink-04);
  color: var(--ink-60);
  font-family: ui-sans-serif, -apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}
.pc-ctxmenu__chevron {
  font-size: 15px;
  color: var(--ink-40);
  flex-shrink: 0;
}
.pc-ctxmenu__divider {
  height: 1px;
  background: var(--ink-08);
  margin: 4px 2px;
  border: 0;
}
</style>
