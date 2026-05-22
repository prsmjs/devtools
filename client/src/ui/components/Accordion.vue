<script setup>
import {
  AccordionRoot,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from "reka-ui"

const props = defineProps({
  // items: [{ key, label, eyebrow?, disabled?, content? }] - or use #content slot
  items: { type: Array, required: true },
  modelValue: { type: [String, Array, null], default: null }, // string or array of keys
  type: { type: String, default: "single" }, // single | multiple
  collapsible: { type: Boolean, default: true },
  variant: { type: String, default: "bordered" }, // bordered | flush
})
const emit = defineEmits(["update:modelValue"])
</script>

<template>
  <AccordionRoot
    :type="type"
    :collapsible="collapsible"
    :model-value="modelValue"
    @update:model-value="v => emit('update:modelValue', v)"
    :class="['pc-accordion', `pc-accordion--${variant}`]"
  >
    <AccordionItem
      v-for="item in items"
      :key="item.key"
      :value="item.key"
      :disabled="item.disabled"
      class="pc-accordion__item"
    >
      <AccordionHeader class="pc-accordion__header">
        <AccordionTrigger class="pc-accordion__trigger">
          <span class="pc-accordion__head-text">
            <span v-if="item.eyebrow" class="pc-accordion__eyebrow">{{ item.eyebrow }}</span>
            <span class="pc-accordion__label">
              <slot name="label" :item="item">{{ item.label }}</slot>
            </span>
          </span>
          <span class="pc-accordion__chevron" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="pc-accordion__content">
        <div class="pc-accordion__body">
          <slot name="content" :item="item">{{ item.content }}</slot>
        </div>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>

<style scoped>
.pc-accordion { display: block; }
.pc-accordion--bordered {
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  background: var(--paper);
  overflow: hidden;
}
.pc-accordion__item + .pc-accordion__item { border-top: 1px solid var(--ink-08); }
.pc-accordion--flush .pc-accordion__item + .pc-accordion__item { border-top: 1px solid var(--ink-08); }

.pc-accordion__header { margin: 0; }
.pc-accordion__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: transparent;
  border: 0;
  outline: none;
  text-align: left;
  font-family: var(--display);
  color: var(--ink);
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease;
}
.pc-accordion__trigger:hover:not([data-disabled]) { background: var(--ink-04); }
.pc-accordion__trigger:focus-visible { box-shadow: inset var(--focus-ring); }
.pc-accordion__trigger[data-disabled] { color: var(--ink-40); cursor: not-allowed; }

.pc-accordion__head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.pc-accordion__eyebrow {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
}
.pc-accordion__label {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  line-height: 1.3;
}
.pc-accordion__chevron {
  width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--ink-60);
  flex-shrink: 0;
  transition: rotate 200ms ease;
}
.pc-accordion__trigger[data-state="open"] .pc-accordion__chevron { rotate: 180deg; color: var(--ink); }

.pc-accordion__content {
  overflow: hidden;
}
.pc-accordion__content[data-state="open"] { animation: pc-accordion-down 220ms ease-out; }
.pc-accordion__content[data-state="closed"] { animation: pc-accordion-up 180ms ease-out; }
@keyframes pc-accordion-down {
  from { height: 0; }
  to { height: var(--reka-accordion-content-height); }
}
@keyframes pc-accordion-up {
  from { height: var(--reka-accordion-content-height); }
  to { height: 0; }
}
.pc-accordion__body {
  padding: 0 18px 18px;
  font-size: 14px;
  letter-spacing: -0.14px;
  line-height: 1.55;
  color: var(--ink);
}

/* flush variant - no outer border/bg, dividers only */
.pc-accordion--flush {
  border-top: 1px solid var(--ink-08);
  border-bottom: 1px solid var(--ink-08);
}
.pc-accordion--flush .pc-accordion__trigger { padding: 14px 0; }
.pc-accordion--flush .pc-accordion__trigger:hover { background: transparent; color: var(--ink); }
.pc-accordion--flush .pc-accordion__body { padding: 0 0 18px; }
</style>
