<script setup>
</script>

<template>
  <kbd class="pc-kbd"><slot /></kbd>
</template>

<style scoped>
.pc-kbd {
  display: inline-block;
  padding: 1px 6px;
  font-family: var(--mono);
  font-size: 11px;
  background: var(--ink-04);
  border: 1px solid var(--ink-08);
  border-radius: 3px;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ink);
  line-height: 1.4;
}
</style>
