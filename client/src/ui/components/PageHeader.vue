<script setup>
defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  size: { type: String, default: "default" }, // default | large
  // padded false -> no outer padding (caller controls spacing)
  padded: { type: Boolean, default: true },
})
</script>

<template>
  <header :class="['pc-page-header', `pc-page-header--${size}`, { 'pc-page-header--padded': padded }]">
    <div class="pc-page-header__main">
      <div v-if="$slots.breadcrumbs" class="pc-page-header__breadcrumbs">
        <slot name="breadcrumbs" />
      </div>
      <div v-if="eyebrow" class="pc-page-header__eyebrow">{{ eyebrow }}</div>
      <h1 v-if="title || $slots.title" class="pc-page-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>
      <p v-if="subtitle || $slots.subtitle" class="pc-page-header__subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </p>
    </div>
    <div v-if="$slots.actions" class="pc-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.pc-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.pc-page-header--padded.pc-page-header--default { padding: 28px 32px 20px; }
.pc-page-header--padded.pc-page-header--large { padding: 40px 32px 28px; }

.pc-page-header__main { display: flex; flex-direction: column; min-width: 0; }

.pc-page-header__breadcrumbs { margin-bottom: 32px; }

.pc-page-header__eyebrow {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-60);
  margin-bottom: 8px;
}

.pc-page-header__title {
  font-family: var(--display);
  font-weight: 500;
  margin: 0;
  color: var(--ink);
}
.pc-page-header__subtitle {
  color: var(--ink-60);
  margin: 0;
}

/* default size */
.pc-page-header--default .pc-page-header__title {
  font-size: 28px;
  letter-spacing: -0.56px;
  line-height: 1.15;
}
.pc-page-header--default .pc-page-header__subtitle {
  font-size: 14px;
  letter-spacing: -0.14px;
  line-height: 1.45;
  margin-top: 4px;
  max-width: 560px;
}

/* large / editorial size - matches the display scale in DESIGN.md */
.pc-page-header--large .pc-page-header__title {
  font-size: 48px;
  letter-spacing: -1.20px;
  line-height: 1.05;
}
.pc-page-header--large .pc-page-header__subtitle {
  font-size: 18px;
  letter-spacing: -0.18px;
  line-height: 1.45;
  margin-top: 12px;
  max-width: 660px;
}

.pc-page-header__actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
</style>
