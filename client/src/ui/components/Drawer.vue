<script setup>
import { watch, onBeforeUnmount } from "vue"

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  side: { type: String, default: "right" }, // left | right | top | bottom
  size: { type: String, default: "md" }, // sm | md | lg | xl | full
  title: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  closeOnBackdrop: { type: Boolean, default: true },
  closeOnEsc: { type: Boolean, default: true },
})
const emit = defineEmits(["update:modelValue", "close"])

const close = () => { emit("update:modelValue", false); emit("close") }
const onKey = (e) => { if (e.key === "Escape" && props.closeOnEsc) close() }

watch(() => props.modelValue, (v) => {
  if (v) {
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
  } else {
    document.removeEventListener("keydown", onKey)
    document.body.style.overflow = ""
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey)
  document.body.style.overflow = ""
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pc-drawer" :duration="300">
      <div v-if="modelValue" :class="['pc-drawer-root', `pc-drawer-root--${side}`]">
        <div class="pc-drawer-backdrop" @click="closeOnBackdrop && close()" />
        <aside
          :class="['pc-drawer', `pc-drawer--${side}`, `pc-drawer--${size}`]"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <header v-if="title || eyebrow || $slots.header" class="pc-drawer__header">
            <slot name="header">
              <div class="pc-drawer__head-text">
                <div v-if="eyebrow" class="pc-drawer__eyebrow">{{ eyebrow }}</div>
                <h3 v-if="title" class="pc-drawer__title">{{ title }}</h3>
              </div>
            </slot>
            <button class="pc-drawer__close" type="button" aria-label="Close" @click="close">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </button>
          </header>
          <div class="pc-drawer__body pc-scroll"><slot :close="close" /></div>
          <footer v-if="$slots.footer" class="pc-drawer__footer">
            <slot name="footer" :close="close" />
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pc-drawer-root {
  position: fixed; inset: 0;
  z-index: 9500;
  display: flex;
}
.pc-drawer-root--right  { justify-content: flex-end; }
.pc-drawer-root--left   { justify-content: flex-start; }
.pc-drawer-root--top    { align-items: flex-start; flex-direction: column; }
.pc-drawer-root--bottom { align-items: flex-end; flex-direction: column; justify-content: flex-end; }

.pc-drawer-backdrop {
  position: absolute; inset: 0;
  background: rgba(1, 1, 32, 0.40);
  backdrop-filter: blur(2px);
}

.pc-drawer {
  position: relative;
  background: var(--paper);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-medium);
  border: 1px solid var(--ink-08);
}
.pc-drawer--right, .pc-drawer--left {
  height: 100%;
  border-radius: 0;
}
.pc-drawer--right { border-right: 0; }
.pc-drawer--left { border-left: 0; }
.pc-drawer--top, .pc-drawer--bottom {
  width: 100%;
  border-radius: 0;
}
.pc-drawer--top { border-top: 0; }
.pc-drawer--bottom { border-bottom: 0; }

/* sizes */
.pc-drawer--right.pc-drawer--sm, .pc-drawer--left.pc-drawer--sm  { width: 320px; max-width: 100vw; }
.pc-drawer--right.pc-drawer--md, .pc-drawer--left.pc-drawer--md  { width: 480px; max-width: 100vw; }
.pc-drawer--right.pc-drawer--lg, .pc-drawer--left.pc-drawer--lg  { width: 640px; max-width: 100vw; }
.pc-drawer--right.pc-drawer--xl, .pc-drawer--left.pc-drawer--xl  { width: 800px; max-width: 100vw; }
.pc-drawer--right.pc-drawer--full, .pc-drawer--left.pc-drawer--full { width: 100vw; }

.pc-drawer--top.pc-drawer--sm,    .pc-drawer--bottom.pc-drawer--sm    { height: 240px; max-height: 100vh; }
.pc-drawer--top.pc-drawer--md,    .pc-drawer--bottom.pc-drawer--md    { height: 360px; max-height: 100vh; }
.pc-drawer--top.pc-drawer--lg,    .pc-drawer--bottom.pc-drawer--lg    { height: 480px; max-height: 100vh; }
.pc-drawer--top.pc-drawer--xl,    .pc-drawer--bottom.pc-drawer--xl    { height: 640px; max-height: 100vh; }
.pc-drawer--top.pc-drawer--full,  .pc-drawer--bottom.pc-drawer--full  { height: 100vh; }

.pc-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 8px;
}
.pc-drawer__head-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pc-drawer__eyebrow {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-60);
}
.pc-drawer__title {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.32px;
  line-height: 1.2;
  color: var(--ink);
}
.pc-drawer__close {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px;
  color: var(--ink-60);
  line-height: 1;
  transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 60ms ease;
  outline: none;
  flex-shrink: 0;
}
.pc-drawer__close:hover { background: var(--ink-04); color: var(--ink); }
.pc-drawer__close:active { transform: translateY(0.5px); }
.pc-drawer__close:focus-visible { box-shadow: var(--focus-ring); }

.pc-drawer__body {
  padding: 12px 24px 24px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.pc-drawer__footer {
  padding: 12px 24px 20px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* transitions - the backdrop fades AND blurs together, the panel slides */
.pc-drawer-enter-active .pc-drawer-backdrop,
.pc-drawer-leave-active .pc-drawer-backdrop {
  transition: opacity 280ms ease, backdrop-filter 280ms ease, -webkit-backdrop-filter 280ms ease;
}
.pc-drawer-enter-from .pc-drawer-backdrop,
.pc-drawer-leave-to .pc-drawer-backdrop {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}
.pc-drawer-enter-active .pc-drawer,
.pc-drawer-leave-active .pc-drawer { transition: translate 280ms cubic-bezier(0.22, 1, 0.36, 1); }
.pc-drawer-enter-from .pc-drawer--right, .pc-drawer-leave-to .pc-drawer--right  { translate: 100% 0; }
.pc-drawer-enter-from .pc-drawer--left, .pc-drawer-leave-to .pc-drawer--left    { translate: -100% 0; }
.pc-drawer-enter-from .pc-drawer--top, .pc-drawer-leave-to .pc-drawer--top      { translate: 0 -100%; }
.pc-drawer-enter-from .pc-drawer--bottom, .pc-drawer-leave-to .pc-drawer--bottom { translate: 0 100%; }
</style>
