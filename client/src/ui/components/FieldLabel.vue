<script setup>
defineProps({
  for: { type: String, default: undefined },
  required: { type: Boolean, default: false },
})
</script>

<template>
  <label :for="$props.for" class="pc-field-label">
    <slot />
    <span v-if="required" class="pc-field-label__req">*</span>
  </label>
</template>

<style scoped>
.pc-field-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
  margin-bottom: 4px;
}
.pc-field-label__req { color: var(--status-failed); }
</style>
