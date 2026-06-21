<script setup>
import { computed, ref, nextTick } from "vue"
import {
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPortal,
  ComboboxContent,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxEmpty,
} from "reka-ui"
import ScrollArea from "./ScrollArea.vue"

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, required: true }, // [{ value, label }] or [string]
  placeholder: { type: String, default: "Select..." },
  emptyText: { type: String, default: "No matches" },
  disabled: { type: Boolean, default: false },
  // when false, the field behaves as a plain single-select: no typing,
  // pointer cursor, click to open, choose only from the list
  searchable: { type: Boolean, default: true },
  clearable: { type: Boolean, default: true },
  size: { type: String, default: "md" }, // sm | md | lg
})
const emit = defineEmits(["update:modelValue"])

const normalize = (o) => (typeof o === "object" && o !== null) ? o : { value: o, label: String(o) }
const normalized = computed(() => props.options.map(normalize))

const selectedLabel = computed(() => {
  const m = normalized.value.find(o => o.value === props.modelValue)
  return m?.label ?? ""
})

// controlled open state so a non-searchable field can open from the input itself
const open = ref(false)
const onInputClick = () => {
  if (!props.searchable) open.value = !open.value
}

const inputRef = ref(null)
const hasValue = computed(() =>
  props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== ""
)
// clear the value, open the list, and (when searchable) focus the input to type
const onClear = () => {
  emit("update:modelValue", null)
  query.value = ""
  open.value = true
  if (props.searchable) {
    nextTick(() => inputRef.value?.$el?.focus?.())
  }
}

const query = ref("")
const filtered = computed(() => {
  if (!props.searchable) return normalized.value
  const q = query.value.trim().toLowerCase()
  if (!q) return normalized.value
  return normalized.value.filter(o => o.label.toLowerCase().includes(q))
})
</script>

<template>
  <ComboboxRoot
    :model-value="modelValue"
    @update:model-value="v => emit('update:modelValue', v)"
    :open="open"
    @update:open="v => open = v"
    :disabled="disabled"
    :class="['pc-combobox', `pc-combobox--${size}`]"
  >
    <ComboboxAnchor class="pc-combobox__anchor">
      <ComboboxInput
        ref="inputRef"
        v-model="query"
        :display-value="() => selectedLabel"
        :placeholder="placeholder"
        :readonly="!searchable"
        :class="['pc-combobox__input', { 'pc-combobox__input--static': !searchable }]"
        @click="onInputClick"
      />
      <button
        v-if="hasValue && !disabled && clearable"
        type="button"
        class="pc-combobox__clear"
        aria-label="Clear"
        @click.stop="onClear"
      >
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
      <ComboboxTrigger class="pc-combobox__trigger" aria-label="Toggle">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>
        </svg>
      </ComboboxTrigger>
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent class="pc-combobox__content" :side-offset="4" position="popper">
        <ScrollArea max-height="280px">
          <div class="pc-combobox__list">
            <ComboboxEmpty class="pc-combobox__empty">{{ emptyText }}</ComboboxEmpty>
            <ComboboxItem
              v-for="opt in filtered"
              :key="opt.value"
              :value="opt.value"
              class="pc-combobox__item"
            >
              <slot name="option" :option="opt" :selected="opt.value === modelValue">
                <span class="pc-combobox__label">{{ opt.label }}</span>
              </slot>
              <ComboboxItemIndicator class="pc-combobox__indicator">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </ComboboxItemIndicator>
            </ComboboxItem>
          </div>
        </ScrollArea>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>

<style scoped>
.pc-combobox { width: 100%; }
.pc-combobox__anchor {
  display: inline-flex;
  align-items: center;
  width: 100%;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background: var(--paper);
  height: var(--control-h);
  transition: border-color 140ms ease, box-shadow 140ms ease;
  box-sizing: border-box;
}
.pc-combobox__anchor:hover:not(:focus-within) { border-color: var(--ink-20); }
.pc-combobox__anchor:focus-within { border-color: var(--midnight); box-shadow: var(--focus-ring); }
.pc-combobox--sm .pc-combobox__anchor { height: var(--control-h-sm); }
.pc-combobox--lg .pc-combobox__anchor { height: var(--control-h-lg); }
.pc-combobox--sm .pc-combobox__input { padding: 0 10px; font-size: 13px; }
.pc-combobox--lg .pc-combobox__input { padding: 0 14px; font-size: 15px; }
.pc-combobox--sm .pc-combobox__trigger { width: 26px; }
.pc-combobox__input {
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  font-family: var(--display);
  font-size: 14px;
  letter-spacing: -0.14px;
  color: var(--ink);
  padding: 0 12px;
  height: 100%;
  min-width: 0;
}
.pc-combobox__input::placeholder { color: var(--ink-40); }
/* non-searchable: behaves like a plain select trigger */
.pc-combobox__input--static { cursor: pointer; }
.pc-combobox__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 999px;
  color: var(--ink-60);
  background: transparent;
  border: 0;
  cursor: pointer;
  outline: none;
  transition: background 120ms ease, color 120ms ease, transform 60ms ease, box-shadow 140ms ease;
}
.pc-combobox__clear:hover { background: var(--ink-04); color: var(--ink); }
.pc-combobox__clear:active { transform: translateY(0.5px); }
.pc-combobox__clear:focus-visible { box-shadow: var(--focus-ring); }
.pc-combobox__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 100%;
  color: var(--ink-60);
  background: transparent;
  border: 0;
  cursor: pointer;
}
.pc-combobox__trigger:hover { color: var(--ink); }
</style>

<style>
/* unscoped because the content is portaled */
.pc-combobox__content {
  z-index: 8000;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  box-shadow: var(--shadow-medium);
  min-width: var(--reka-combobox-trigger-width);
  overflow: hidden;
  font-family: var(--display);
}
.pc-combobox__content[data-state="open"] { animation: pc-combobox-in 120ms ease-out; }
/* exit - distinct keyframe (reka defers unmount until it finishes) */
.pc-combobox__content[data-state="closed"] { animation: pc-combobox-out 110ms ease-in forwards; }
@keyframes pc-combobox-in {
  from { opacity: 0; translate: 0 -4px; }
  to { opacity: 1; translate: 0 0; }
}
@keyframes pc-combobox-out {
  from { opacity: 1; translate: 0 0; }
  to { opacity: 0; translate: 0 -4px; }
}
.pc-combobox__list { padding: 4px; }
.pc-combobox__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius-sharp);
  font-size: 14px;
  letter-spacing: -0.14px;
  color: var(--ink);
  outline: none;
  cursor: pointer;
  user-select: none;
}
.pc-combobox__item[data-highlighted] { background: var(--ink-04); }
.pc-combobox__item:active { background: var(--ink-08); }
.pc-combobox__item[data-state="checked"] { font-weight: 500; }
.pc-combobox__label { flex: 1; min-width: 0; }
.pc-combobox__indicator { color: var(--ink); display: inline-flex; align-items: center; }
.pc-combobox__empty {
  padding: 14px;
  text-align: center;
  color: var(--ink-40);
  font-size: 13px;
}
</style>
