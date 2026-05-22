<script setup>
import { watch, onBeforeUnmount } from "vue"

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: "" },
  size: { type: String, default: "md" }, // sm | md | lg | xl
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
    <Transition name="pc-modal" :duration="260">
      <div v-if="modelValue" class="pc-modal-root">
        <div class="pc-modal-backdrop" @click="closeOnBackdrop && close()" />
        <div :class="['pc-modal', `pc-modal--${size}`]" role="dialog" aria-modal="true">
          <header v-if="title || $slots.header" class="pc-modal__header">
            <slot name="header"><h3 class="pc-modal__title">{{ title }}</h3></slot>
            <button class="pc-modal__close" type="button" aria-label="Close" @click="close">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </button>
          </header>
          <div class="pc-modal__body"><slot :close="close" /></div>
          <footer v-if="$slots.footer" class="pc-modal__footer">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pc-modal-root {
  position: fixed; inset: 0;
  z-index: 9500;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.pc-modal-backdrop {
  position: absolute; inset: 0;
  background: rgba(1, 1, 32, 0.40);
  backdrop-filter: blur(2px);
}
.pc-modal {
  position: relative;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  box-shadow: var(--shadow-medium);
  width: 100%;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
}
.pc-modal--sm { max-width: 380px; }
.pc-modal--md { max-width: 520px; }
.pc-modal--lg { max-width: 720px; }
.pc-modal--xl { max-width: 960px; }
.pc-modal__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 20px 4px;
}
.pc-modal__title { font-size: 18px; font-weight: 500; letter-spacing: -0.18px; margin: 0; }
.pc-modal__close {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px;
  color: var(--ink-60);
  line-height: 1;
  transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 60ms ease;
  outline: none;
}
.pc-modal__close:hover { background: var(--ink-04); color: var(--ink); }
.pc-modal__close:active { transform: translateY(0.5px); }
.pc-modal__close:focus-visible { box-shadow: var(--focus-ring); }
.pc-modal__body { padding: 12px 20px 20px; overflow-y: auto; }
.pc-modal__footer {
  padding: 8px 20px 20px;
  display: flex; gap: 8px; justify-content: flex-end;
}

/* transitions - the backdrop fades AND blurs together, the panel lifts in */
.pc-modal-enter-active .pc-modal-backdrop,
.pc-modal-leave-active .pc-modal-backdrop {
  transition: opacity 200ms ease, backdrop-filter 200ms ease, -webkit-backdrop-filter 200ms ease;
}
.pc-modal-enter-from .pc-modal-backdrop,
.pc-modal-leave-to .pc-modal-backdrop {
  opacity: 0;
  backdrop-filter: blur(0px);
  -webkit-backdrop-filter: blur(0px);
}
.pc-modal-enter-active .pc-modal,
.pc-modal-leave-active .pc-modal { transition: transform 200ms ease, opacity 200ms ease; }
.pc-modal-enter-from .pc-modal,
.pc-modal-leave-to .pc-modal { transform: translateY(8px); opacity: 0; }
</style>
