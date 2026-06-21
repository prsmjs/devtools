<script setup>
import { computed } from "vue"
import { Icon } from "@iconify/vue"

const props = defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  icon: { type: String, default: "" },
  align: { type: String, default: "center" }, // center | start
  size: { type: String, default: "md" }, // sm | md | lg
  layout: { type: String, default: "stacked" }, // stacked | row
  bordered: { type: Boolean, default: false },
})

// an icon string with a ":" is treated as an iconify name (e.g. lucide:inbox)
// anything else renders as literal text so emoji and glyphs keep working
const isIconifyName = computed(
  () => typeof props.icon === "string" && props.icon.includes(":"),
)
</script>

<template>
  <div
    class="pc-empty"
    :class="[
      `pc-empty--${align}`,
      `pc-empty--${size}`,
      `pc-empty--${layout}`,
      { 'pc-empty--bordered': bordered },
    ]"
  >
    <div class="pc-empty__main">
      <div v-if="icon || $slots.icon" class="pc-empty__icon" aria-hidden="true">
        <slot name="icon">
          <Icon v-if="isIconifyName" :icon="icon" />
          <template v-else>{{ icon }}</template>
        </slot>
      </div>
      <div class="pc-empty__body">
        <div v-if="title || $slots.title" class="pc-empty__title">
          <slot name="title">{{ title }}</slot>
        </div>
        <div v-if="description || $slots.description" class="pc-empty__desc">
          <slot name="description">{{ description }}</slot>
        </div>
      </div>
    </div>
    <div v-if="$slots.default" class="pc-empty__actions"><slot /></div>
  </div>
</template>

<style scoped>
.pc-empty {
  display: flex;
  flex-direction: column;
  color: var(--ink-60);
}

.pc-empty__main {
  display: flex;
  flex-direction: column;
}

/* alignment */
.pc-empty--center { align-items: center; }
.pc-empty--center .pc-empty__main { align-items: center; text-align: center; }
.pc-empty--start { align-items: flex-start; }
.pc-empty--start .pc-empty__main { align-items: flex-start; text-align: left; }

/* row layout: icon to the left, title + description stacked to its right,
   actions drop below the whole thing, left-aligned with the icon */
.pc-empty--row .pc-empty__main {
  flex-direction: row;
  align-items: flex-start;
  text-align: left;
}

.pc-empty__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--radius-comfy);
  background: var(--ink-04);
  color: var(--ink-40);
  line-height: 1;
}

.pc-empty__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pc-empty__title {
  font-family: var(--display);
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.2px;
}
.pc-empty__desc { color: var(--ink-60); }
.pc-empty__actions { display: flex; flex-wrap: wrap; gap: 8px; }

/* sizes */
.pc-empty--sm { gap: 12px; padding: 16px; }
.pc-empty--sm .pc-empty__main { gap: 8px; }
.pc-empty--sm.pc-empty--row .pc-empty__main { gap: 12px; }
.pc-empty--sm .pc-empty__icon { width: 32px; height: 32px; font-size: 16px; border-radius: var(--radius-sharp); }
.pc-empty--sm .pc-empty__title { font-size: 14px; }
.pc-empty--sm .pc-empty__desc { font-size: 13px; max-width: 320px; }

.pc-empty--md { gap: 16px; padding: 36px 24px; }
.pc-empty--md .pc-empty__main { gap: 10px; }
.pc-empty--md.pc-empty--row .pc-empty__main { gap: 14px; }
.pc-empty--md .pc-empty__icon { width: 44px; height: 44px; font-size: 22px; }
.pc-empty--md .pc-empty__title { font-size: 17px; }
.pc-empty--md .pc-empty__desc { font-size: 14px; max-width: 380px; }

.pc-empty--lg { gap: 20px; padding: 64px 32px; }
.pc-empty--lg .pc-empty__main { gap: 14px; }
.pc-empty--lg.pc-empty--row .pc-empty__main { gap: 16px; }
.pc-empty--lg .pc-empty__icon { width: 60px; height: 60px; font-size: 30px; }
.pc-empty--lg .pc-empty__title { font-size: 21px; }
.pc-empty--lg .pc-empty__desc { font-size: 15px; max-width: 440px; line-height: 1.5; }

/* bordered, inset look for sitting inside a panel or empty region */
.pc-empty--bordered {
  border: 1px dashed var(--ink-08);
  border-radius: var(--radius-comfy);
  background: var(--ink-04);
}

/* gentle entrance, considerate of reduced-motion - icon first, then the body, then the actions */
.pc-empty__icon {
  animation: pc-empty-in 480ms cubic-bezier(0.16, 1, 0.3, 1) 40ms both;
}
.pc-empty__body {
  animation: pc-empty-in 320ms cubic-bezier(0.16, 1, 0.3, 1) 160ms both;
}
.pc-empty__actions {
  animation: pc-empty-in 320ms cubic-bezier(0.16, 1, 0.3, 1) 260ms both;
}
@media (prefers-reduced-motion: reduce) {
  .pc-empty__icon,
  .pc-empty__body,
  .pc-empty__actions { animation: none; }
}
@keyframes pc-empty-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
