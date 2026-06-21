<script setup>
defineProps({
  vertical: { type: Boolean, default: false },
  dashed: { type: Boolean, default: false },
})
</script>

<template>
  <hr :class="['pc-divider', { 'pc-divider--vertical': vertical, 'pc-divider--dashed': dashed }]" />
</template>

<style scoped>
.pc-divider {
  border: 0;
  margin: 0;
  background: var(--ink-08);
  height: 1px;
  width: 100%;
}
.pc-divider--vertical { width: 1px; height: 100%; }

.pc-divider--dashed {
  background: transparent;
  height: 0;
  border-top: 1px dashed var(--ink-20);
}
.pc-divider--dashed.pc-divider--vertical {
  height: 100%;
  width: 0;
  border-top: 0;
  border-left: 1px dashed var(--ink-20);
}
</style>
