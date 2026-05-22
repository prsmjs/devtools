<script setup>
defineProps({
  navWidth: { type: String, default: "240px" },
})
</script>

<template>
  <div class="pc-layout">
    <aside class="pc-layout__nav" :style="{ width: navWidth }"><slot name="nav" /></aside>
    <div class="pc-layout__main">
      <header v-if="$slots.header" class="pc-layout__header"><slot name="header" /></header>
      <main class="pc-layout__content pc-scroll"><slot /></main>
    </div>
  </div>
</template>

<style scoped>
.pc-layout {
  display: flex;
  height: 100vh;
  width: 100%;
  background: var(--paper);
  color: var(--ink);
}
.pc-layout__nav {
  flex-shrink: 0;
  border-right: 1px solid var(--ink-08);
  height: 100%;
  overflow-y: auto;
  background: var(--paper);
}
.pc-layout__main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.pc-layout__header {
  flex-shrink: 0;
  border-bottom: 1px solid var(--ink-08);
}
.pc-layout__content {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
}
</style>
