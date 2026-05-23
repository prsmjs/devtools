<script setup>
import ScrollArea from "./ScrollArea.vue"

const props = defineProps({
  // sections: [{ title?, items: [{ key, label, to?, badge?, active?, icon? }] }]
  sections: { type: Array, required: true },
  activeKey: { type: [String, Number, null], default: null },
  // show the small leading dot indicator on each item
  indicators: { type: Boolean, default: false },
  // wash the header (branding) area with a soft pastel gradient
  tintedHeader: { type: Boolean, default: false },
})
const emit = defineEmits(["select"])
const isActive = (item) => item.active ?? (item.key === props.activeKey)
</script>

<template>
  <nav class="pc-sidenav">
    <header
      v-if="$slots.header"
      :class="['pc-sidenav__header', { 'pc-sidenav__header--tinted': tintedHeader }]"
    ><slot name="header" /></header>

    <ScrollArea class="pc-sidenav__sections" height="100%">
      <div class="pc-sidenav__sections-list">
        <div v-for="section in sections" :key="section.title" class="pc-sidenav__section">
          <div v-if="section.title" class="pc-sidenav__section-title">{{ section.title }}</div>
          <ul class="pc-sidenav__items">
            <li v-for="item in section.items" :key="item.key">
              <component
                :is="item.to ? 'a' : 'button'"
                :href="item.to"
                type="button"
                :class="['pc-sidenav__link', { 'pc-sidenav__link--active': isActive(item) }]"
                @click="emit('select', item)"
              >
                <slot name="icon" :item="item">
                  <span v-if="item.icon" class="pc-sidenav__icon">{{ item.icon }}</span>
                </slot>
                <span v-if="indicators && !item.icon && !$slots.icon" class="pc-sidenav__indicator" />
                <span class="pc-sidenav__name">{{ item.label }}</span>
                <span v-if="item.badge != null && item.badge !== 0" class="pc-sidenav__badge">{{ item.badge }}</span>
              </component>
            </li>
          </ul>
        </div>
      </div>
    </ScrollArea>

    <footer v-if="$slots.footer" class="pc-sidenav__footer"><slot name="footer" /></footer>
  </nav>
</template>

<style scoped>
.pc-sidenav {
  height: 100%;
  background: var(--paper);
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  gap: 20px;
}
/* 10px inset matches the section labels + nav-item content */
.pc-sidenav__header { flex-shrink: 0; padding: 0 10px; }
/* optional pastel wash - bleeds to the sidebar edges, content stays aligned */
.pc-sidenav__header--tinted {
  margin: -20px -16px 0;
  padding: 20px 26px;
  background:
    radial-gradient(75% 100% at 0% 0%, rgba(189, 187, 255, 0.32), transparent 72%),
    radial-gradient(70% 95% at 100% 0%, rgba(214, 225, 255, 0.34), transparent 70%),
    var(--paper);
}
.pc-sidenav__sections {
  flex: 1;
  min-height: 0;
}
.pc-sidenav__sections-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.pc-sidenav__section { display: flex; flex-direction: column; gap: 8px; }
.pc-sidenav__section-title {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
  padding: 0 10px;
}
.pc-sidenav__items { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
.pc-sidenav__link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sharp);
  font-size: 14px;
  letter-spacing: -0.18px;
  color: var(--ink);
  position: relative;
  width: 100%;
  text-align: left;
  font-family: var(--display);
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease;
  outline: none;
}
.pc-sidenav__link:hover:not(.pc-sidenav__link--active) { background: var(--ink-04); color: var(--ink); }
.pc-sidenav__link:focus-visible { box-shadow: var(--focus-ring); }
.pc-sidenav__link--active { background: var(--midnight); color: var(--paper-on-dark); }
.pc-sidenav__link--active:hover { background: var(--midnight-hover); }
.pc-sidenav__link--active:focus-visible { box-shadow: var(--focus-ring-on-dark); }
.pc-sidenav__indicator {
  width: 4px; height: 4px; border-radius: 50%;
  background: currentColor; opacity: 0.4;
  flex-shrink: 0;
}
.pc-sidenav__link--active .pc-sidenav__indicator { opacity: 1; }
.pc-sidenav__icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  opacity: 0.7;
}
.pc-sidenav__link--active .pc-sidenav__icon { opacity: 1; }
.pc-sidenav__name { flex: 1; min-width: 0; }
.pc-sidenav__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--badge-radius);
  background: var(--lavender);
  color: var(--midnight);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.pc-sidenav__link--active .pc-sidenav__badge { background: var(--paper); color: var(--midnight); }
.pc-sidenav__footer { flex-shrink: 0; border-top: 1px solid var(--ink-08); padding: 12px 10px 0; }
</style>
