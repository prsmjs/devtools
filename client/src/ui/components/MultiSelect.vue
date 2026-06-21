<script setup>
import { ref, computed, nextTick, watch } from "vue"
import Popover from "./Popover.vue"
import Input from "./Input.vue"
import ScrollArea from "./ScrollArea.vue"

const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // array of values
  options: { type: Array, required: true }, // [{ value, label, ... }] or [string]
  placeholder: { type: String, default: "Select..." },
  searchable: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: "Search..." },
  /** function(option, query) -> boolean - custom filter */
  filter: { type: Function, default: null },
  disabled: { type: Boolean, default: false },
  /** if true, the trigger shows a count chip; if false, shows a concatenated label */
  countOnly: { type: Boolean, default: false },
  maxLabel: { type: Number, default: 2 }, // show up to N labels before "+N more"
  emptyText: { type: String, default: "No matches" },
})
const emit = defineEmits(["update:modelValue"])

const normalize = (o) => (typeof o === "object" && o !== null) ? o : { value: o, label: String(o) }
const normalized = computed(() => props.options.map(normalize))

const isSelected = (v) => props.modelValue.includes(v)

const toggle = (opt) => {
  if (opt.disabled) return
  const next = isSelected(opt.value)
    ? props.modelValue.filter(v => v !== opt.value)
    : [...props.modelValue, opt.value]
  emit("update:modelValue", next)
}

const clear = (e) => {
  e?.stopPropagation()
  emit("update:modelValue", [])
}

const query = ref("")
const filtered = computed(() => {
  if (!props.searchable || !query.value.trim()) return normalized.value
  const q = query.value.toLowerCase().trim()
  if (props.filter) return normalized.value.filter(o => props.filter(o, query.value))
  return normalized.value.filter(o => o.label.toLowerCase().includes(q))
})

const selectedOptions = computed(() =>
  props.modelValue.map(v => normalized.value.find(o => o.value === v)).filter(Boolean)
)

const triggerLabel = computed(() => {
  if (!selectedOptions.value.length) return props.placeholder
  if (props.countOnly) return `${selectedOptions.value.length} selected`
  const labels = selectedOptions.value.map(o => o.label)
  if (labels.length <= props.maxLabel) return labels.join(", ")
  return `${labels.slice(0, props.maxLabel).join(", ")} +${labels.length - props.maxLabel}`
})

const open = ref(false)
const searchRef = ref(null)
watch(open, (v) => {
  if (v && props.searchable) {
    // wait for the popover content (and a frame for the open animation) before focusing
    nextTick(() => requestAnimationFrame(() => searchRef.value?.focus?.()))
  } else if (!v) {
    query.value = ""
  }
})
</script>

<template>
  <Popover v-model="open" placement="bottom-start" :offset="4">
    <template #trigger>
      <button
        type="button"
        :disabled="disabled"
        :class="['pc-multiselect__trigger', { 'pc-multiselect__trigger--empty': !modelValue.length }]"
      >
        <span class="pc-multiselect__value">{{ triggerLabel }}</span>
        <span v-if="modelValue.length" class="pc-multiselect__count">{{ modelValue.length }}</span>
        <span
          v-if="modelValue.length"
          class="pc-multiselect__clear"
          aria-label="Clear selection"
          role="button"
          tabindex="0"
          @click="clear"
          @keydown.enter.prevent="clear"
          @keydown.space.prevent="clear"
        >
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </span>
        <span v-else class="pc-multiselect__chevron" aria-hidden="true">▾</span>
      </button>
    </template>

    <div class="pc-multiselect__panel" style="padding: 0;">
      <div v-if="searchable" class="pc-multiselect__search">
        <Input ref="searchRef" v-model="query" :placeholder="searchPlaceholder" size="sm" />
      </div>
      <ScrollArea class="pc-multiselect__list" max-height="280px">
        <div v-if="!filtered.length" class="pc-multiselect__empty">{{ emptyText }}</div>
        <button
          v-for="opt in filtered"
          :key="opt.value"
          type="button"
          :class="['pc-multiselect__option', { 'pc-multiselect__option--selected': isSelected(opt.value), 'pc-multiselect__option--disabled': opt.disabled }]"
          :disabled="opt.disabled"
          @click="toggle(opt)"
        >
          <span class="pc-multiselect__check" aria-hidden="true">
            <svg v-if="isSelected(opt.value)" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="pc-multiselect__label">
            <slot name="option" :option="opt" :selected="isSelected(opt.value)">
              {{ opt.label }}
            </slot>
          </span>
        </button>
      </ScrollArea>
      <div v-if="$slots.footer" class="pc-multiselect__footer"><slot name="footer" :close="() => open = false" /></div>
    </div>
  </Popover>
</template>

<style scoped>
.pc-multiselect__trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 220px;
  max-width: 360px;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  padding: 0 8px 0 12px;
  height: var(--control-h);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--display);
  font-size: 14px;
  letter-spacing: -0.14px;
  line-height: 1.2;
  cursor: pointer;
  outline: none;
  transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
  text-align: left;
}
.pc-multiselect__trigger:hover:not(:disabled) { border-color: var(--ink-20); background: var(--ink-04); }
.pc-multiselect__trigger:focus-visible { border-color: var(--midnight); box-shadow: var(--focus-ring); }
.pc-multiselect__trigger:disabled { opacity: 0.5; cursor: not-allowed; }
.pc-multiselect__trigger--empty .pc-multiselect__value { color: var(--ink-40); }

.pc-multiselect__value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.pc-multiselect__count {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  background: var(--midnight);
  color: var(--paper-on-dark);
  padding: 2px 6px;
  border-radius: var(--badge-radius);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.pc-multiselect__chevron {
  color: var(--ink-40);
  font-size: 10px;
  flex-shrink: 0;
}
.pc-multiselect__clear {
  width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px;
  color: var(--ink-60);
  font-size: 14px;
  flex-shrink: 0;
  transition: background 120ms ease, color 120ms ease;
}
.pc-multiselect__clear:hover { background: var(--ink-04); color: var(--ink); }

.pc-multiselect__panel {
  min-width: 240px;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  /* offset Popover's default padding */
  margin: -12px;
}
.pc-multiselect__search {
  padding: 8px;
  border-bottom: 1px solid var(--ink-08);
}
.pc-multiselect__list {
  padding: 4px;
}
.pc-multiselect__option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 10px;
  border-radius: var(--radius-sharp);
  background: transparent;
  color: var(--ink);
  font-family: var(--display);
  font-size: 14px;
  letter-spacing: -0.14px;
  text-align: left;
  outline: none;
  transition: background 120ms ease;
}
.pc-multiselect__option:hover:not(:disabled) { background: var(--ink-04); }
.pc-multiselect__option:focus-visible { background: var(--ink-04); box-shadow: var(--focus-ring); }
.pc-multiselect__option:active:not(:disabled) { background: var(--ink-08); }
.pc-multiselect__option--selected { color: var(--ink); font-weight: 500; }
.pc-multiselect__option--disabled { color: var(--ink-40); cursor: not-allowed; }
.pc-multiselect__check {
  width: 16px; height: 16px;
  border: 1px solid var(--ink-20);
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--paper);
  background: var(--paper);
  transition: background 120ms ease, border-color 120ms ease;
}
.pc-multiselect__option--selected .pc-multiselect__check {
  background: var(--midnight);
  border-color: var(--midnight);
}
.pc-multiselect__label { flex: 1; min-width: 0; }
.pc-multiselect__empty {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--ink-40);
}
.pc-multiselect__footer {
  border-top: 1px solid var(--ink-08);
  padding: 8px;
}
</style>
