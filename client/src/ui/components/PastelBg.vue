<script setup>
defineProps({
  variant: { type: String, default: "default" }, // default | soft
})
</script>

<template>
  <div :class="['pc-pastel', `pc-pastel--${variant}`]">
    <slot />
  </div>
</template>

<style scoped>
.pc-pastel { position: relative; }
.pc-pastel--default {
  background:
    radial-gradient(80% 60% at 18% 12%, rgba(239, 44, 193, 0.10), transparent 60%),
    radial-gradient(70% 60% at 82% 22%, rgba(189, 187, 255, 0.40), transparent 65%),
    radial-gradient(90% 70% at 50% 100%, rgba(214, 225, 255, 0.40), transparent 60%),
    radial-gradient(50% 40% at 90% 80%, rgba(252, 76, 2, 0.06), transparent 60%),
    var(--paper);
}
.pc-pastel--soft {
  background:
    radial-gradient(60% 40% at 10% 0%, rgba(189, 187, 255, 0.25), transparent 60%),
    radial-gradient(60% 40% at 100% 100%, rgba(255, 214, 245, 0.30), transparent 60%),
    var(--paper);
}
</style>
