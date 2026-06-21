<script setup>
import { ref, computed } from "vue"
import { useFloating, autoUpdate, offset, flip, shift } from "@floating-ui/vue"
import { useClickOutside } from "../composables/useClickOutside.js"

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ label, value?, icon?, danger?, disabled?, divider? }]
  placement: { type: String, default: "bottom-start" },
})
const emit = defineEmits(["select"])

const open = ref(false)
const triggerRef = ref(null)
const floatingRef = ref(null)

const { floatingStyles, isPositioned } = useFloating(triggerRef, floatingRef, {
  placement: computed(() => props.placement),
  whileElementsMounted: autoUpdate,
  middleware: [offset(4), flip(), shift({ padding: 8 })],
})

useClickOutside([triggerRef, floatingRef], () => { open.value = false })

const onSelect = (item) => {
  if (item.disabled || item.divider) return
  emit("select", item)
  open.value = false
}
</script>

<template>
  <span ref="triggerRef" class="pc-menu-trigger" @click="open = !open">
    <slot :open="open" />
  </span>
  <Teleport to="body">
    <Transition name="pc-menu">
      <div v-if="open" ref="floatingRef" :class="['pc-menu', { 'pc-menu--ready': isPositioned }]" :style="floatingStyles" role="menu">
        <template v-for="(item, i) in items" :key="i">
          <hr v-if="item.divider" class="pc-menu__divider" />
          <button
            v-else
            type="button"
            :class="['pc-menu__item', { 'pc-menu__item--danger': item.danger, 'pc-menu__item--disabled': item.disabled }]"
            :disabled="item.disabled"
            role="menuitem"
            @click="onSelect(item)"
          >
            <span v-if="item.icon" class="pc-menu__icon">{{ item.icon }}</span>
            <span class="pc-menu__label">{{ item.label }}</span>
            <span v-if="item.shortcut" class="pc-menu__shortcut">{{ item.shortcut }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pc-menu-trigger {
  display: inline-flex;
  width: max-content;
  justify-self: start;
  align-self: start;
}
.pc-menu {
  position: absolute;
  z-index: 8500;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  box-shadow: var(--shadow-medium);
  padding: 4px;
  min-width: 180px;
  font-size: 14px;
  opacity: 0;
  visibility: hidden;
}
.pc-menu--ready {
  visibility: visible;
  animation: pc-menu-in 120ms ease-out forwards;
}
/* exit - distinct keyframe so the leave animation actually restarts */
.pc-menu-leave-active.pc-menu--ready {
  animation: pc-menu-out 110ms ease-in forwards;
}
@keyframes pc-menu-in {
  from { opacity: 0; translate: 0 -4px; }
  to { opacity: 1; translate: 0 0; }
}
@keyframes pc-menu-out {
  from { opacity: 1; translate: 0 0; }
  to { opacity: 0; translate: 0 -4px; }
}
.pc-menu__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius-sharp);
  font-size: 14px;
  font-family: var(--display);
  letter-spacing: -0.14px;
  color: var(--ink);
  text-align: left;
  outline: none;
  transition: background 120ms ease, color 120ms ease;
}
.pc-menu__item:hover:not(:disabled) { background: var(--ink-04); }
.pc-menu__item:focus-visible:not(:disabled) { background: var(--ink-04); }
.pc-menu__item--danger { color: var(--status-failed); }
.pc-menu__item--danger:hover:not(:disabled) { background: var(--status-failed-bg); }
/* press feedback - a notch darker than hover */
.pc-menu__item:active:not(:disabled) { background: var(--ink-08); }
.pc-menu__item--danger:active:not(:disabled) {
  background: color-mix(in srgb, var(--status-failed) 18%, var(--paper));
}
.pc-menu__item--disabled { color: var(--ink-40); cursor: not-allowed; }
.pc-menu__icon { font-size: 14px; opacity: 0.8; }
.pc-menu__label { flex: 1; }
.pc-menu__shortcut {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-40);
  letter-spacing: 0.04em;
}
.pc-menu__divider { border: 0; height: 1px; background: var(--ink-08); margin: 4px 0; }
</style>
