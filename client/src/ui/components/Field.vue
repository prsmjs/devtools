<script setup>
import FieldLabel from "./FieldLabel.vue"
defineProps({
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  error: { type: String, default: "" },
  required: { type: Boolean, default: false },
  for: { type: String, default: undefined },
})
</script>

<template>
  <div class="pc-field">
    <FieldLabel v-if="label" :for="$props.for" :required="required">{{ label }}</FieldLabel>
    <slot />
    <div v-if="error" class="pc-field__error">{{ error }}</div>
    <div v-else-if="hint" class="pc-field__hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.pc-field { display: flex; flex-direction: column; gap: 0; }
.pc-field__hint { font-size: 12px; color: var(--ink-60); margin-top: 4px; }
.pc-field__error { font-size: 12px; color: var(--status-failed); margin-top: 4px; }
</style>
