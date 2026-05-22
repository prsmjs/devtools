<script setup>
defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Search" },
  disabled: { type: Boolean, default: false },
  shortcut: { type: String, default: "" },
  size: { type: String, default: "md" }, // sm | md
})
const emit = defineEmits(["update:modelValue", "clear"])
const onInput = (e) => emit("update:modelValue", e.target.value)
const onClear = () => { emit("update:modelValue", ""); emit("clear") }
</script>

<template>
  <label :class="['pc-search', `pc-search--${size}`, { 'pc-search--disabled': disabled }]">
    <span class="pc-search__icon" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4.25" stroke="currentColor" stroke-width="1.4"/>
        <path d="M9.5 9.5L12 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </span>
    <input
      class="pc-search__input"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="onInput"
    />
    <button
      v-if="modelValue"
      type="button"
      class="pc-search__clear"
      aria-label="Clear search"
      @click="onClear"
    >
      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </button>
    <span v-else-if="shortcut" class="pc-search__shortcut">{{ shortcut }}</span>
  </label>
</template>

<style scoped>
.pc-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  padding: 0 10px;
  height: var(--control-h);
  background: var(--paper);
  transition: border-color 140ms ease, box-shadow 140ms ease;
  min-width: 220px;
  flex: 0 1 320px;
  box-sizing: border-box;
}
.pc-search:hover:not(.pc-search--disabled):not(:focus-within) { border-color: var(--ink-20); }
.pc-search:focus-within { border-color: var(--midnight); box-shadow: var(--focus-ring); }
.pc-search--sm { padding: 0 8px; height: var(--control-h-sm); }
.pc-search--disabled { opacity: 0.5; cursor: not-allowed; }
.pc-search__icon { display: inline-flex; color: var(--ink-40); flex-shrink: 0; }
.pc-search__input {
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  font-family: var(--display);
  font-size: 14px;
  letter-spacing: -0.14px;
  color: var(--ink);
  min-width: 0;
  padding: 0;
}
.pc-search--sm .pc-search__input { font-size: 13px; }
.pc-search__input::placeholder { color: var(--ink-40); }
.pc-search__clear {
  width: 18px; height: 18px;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--ink-60);
  font-size: 14px;
  flex-shrink: 0;
  transition: background 120ms ease, color 120ms ease;
}
.pc-search__clear:hover { background: var(--ink-04); color: var(--ink); }
.pc-search__shortcut {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--ink-40);
  background: var(--ink-04);
  border: 1px solid var(--ink-08);
  border-radius: var(--badge-radius);
  padding: 2px 5px;
  flex-shrink: 0;
  line-height: 1.2;
}
</style>
