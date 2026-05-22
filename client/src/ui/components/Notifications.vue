<script setup>
import { toasts, dismissToast, pauseToast, resumeToast } from "../composables/toast.js"

defineProps({
  position: { type: String, default: "bottom-right" }, // top-right | top-left | bottom-right | bottom-left | top-center | bottom-center
  // tinted: soft pastel wash in the variant color (Callout-style) instead of plain white
  tinted: { type: Boolean, default: false },
})

const variantLabel = (v) => ({
  info: "Info",
  success: "Success",
  warning: "Warning",
  danger: "Error",
  neutral: "Notice",
}[v] || "Notice")
</script>

<template>
  <Teleport to="body">
    <div :class="['pc-notifications', `pc-notifications--${position}`]" role="region" aria-label="Notifications">
      <TransitionGroup name="pc-toast" tag="div" class="pc-notifications__stack">
        <article
          v-for="t in toasts"
          :key="t.id"
          :class="['pc-toast', `pc-toast--${t.variant}`, { 'pc-toast--tinted': tinted }]"
          role="status"
          aria-live="polite"
          @mouseenter="pauseToast(t.id)"
          @mouseleave="resumeToast(t.id)"
        >
          <span class="pc-toast__icon" aria-hidden="true">
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
            >
              <template v-if="t.variant === 'success'">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </template>
              <template v-else-if="t.variant === 'warning'">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </template>
              <template v-else-if="t.variant === 'danger'">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
              </template>
              <template v-else-if="t.variant === 'info'">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </template>
              <template v-else>
                <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8a6 6 0 0 0-12 0c0 4.499-1.41 5.956-2.738 7.326z" />
              </template>
            </svg>
          </span>

          <div class="pc-toast__body">
            <div class="pc-toast__eyebrow">{{ t.eyebrow || variantLabel(t.variant) }}</div>
            <div v-if="t.title" class="pc-toast__title">{{ t.title }}</div>
            <div v-if="t.description" class="pc-toast__desc">{{ t.description }}</div>
            <button
              v-if="t.action"
              type="button"
              class="pc-toast__action"
              @click="t.action.onClick?.(); dismissToast(t.id)"
            >{{ t.action.label }}</button>
          </div>

          <button
            type="button"
            class="pc-toast__close"
            aria-label="Dismiss"
            @click="dismissToast(t.id)"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          </button>

          <div v-if="t.duration > 0" class="pc-toast__progress" aria-hidden="true">
            <div
              class="pc-toast__progress-bar"
              :style="{ animationDuration: t.duration + 'ms' }"
            />
          </div>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.pc-notifications {
  position: fixed;
  z-index: 10000;
  display: flex;
  pointer-events: none;
  padding: 20px;
  max-width: 100vw;
}
.pc-notifications__stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 360px;
  max-width: 100%;
  pointer-events: none;
}
.pc-notifications--top-right    { top: 0; right: 0; }
.pc-notifications--top-left     { top: 0; left: 0; }
.pc-notifications--bottom-right { bottom: 0; right: 0; align-items: flex-end; }
.pc-notifications--bottom-left  { bottom: 0; left: 0; }
.pc-notifications--top-center,
.pc-notifications--bottom-center { left: 50%; transform: translateX(-50%); }
.pc-notifications--top-center    { top: 0; }
.pc-notifications--bottom-center { bottom: 0; }
.pc-notifications--bottom-right .pc-notifications__stack,
.pc-notifications--bottom-left .pc-notifications__stack,
.pc-notifications--bottom-center .pc-notifications__stack {
  flex-direction: column-reverse;
}

.pc-toast {
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--paper);
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-comfy);
  padding: 14px 16px;
  box-shadow: var(--shadow-medium);
  font-family: var(--display);
  color: var(--ink);
  min-width: 280px;
  overflow: hidden;
}

/* leading status icon - carries the variant color */
.pc-toast__icon {
  flex-shrink: 0;
  display: inline-flex;
  color: var(--pc-toast-accent);
  margin-top: -1px;
}

.pc-toast__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.pc-toast__eyebrow {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-60);
}
.pc-toast__title {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  line-height: 1.3;
  color: var(--ink);
}
.pc-toast__desc {
  font-size: 13px;
  color: var(--ink-60);
  line-height: 1.45;
  letter-spacing: -0.13px;
}
.pc-toast__action {
  align-self: flex-start;
  margin-top: 8px;
  font-family: var(--display);
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.13px;
  border-bottom: 1px solid var(--ink-20);
  padding: 0 0 1px;
  transition: border-color 140ms ease, color 140ms ease;
  outline: none;
}
.pc-toast__action:hover { border-color: var(--midnight); }
.pc-toast__action:focus-visible { box-shadow: var(--focus-ring); }

.pc-toast__close {
  flex-shrink: 0;
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px;
  color: var(--ink-60);
  line-height: 1;
  transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 60ms ease;
  outline: none;
  margin: -2px -4px -2px 0;
}
.pc-toast__close:hover { background: var(--ink-04); color: var(--ink); }
.pc-toast__close:active { transform: translateY(0.5px); }
.pc-toast__close:focus-visible { box-shadow: var(--focus-ring); }

/* variant accent - drives the icon and the progress bar */
.pc-toast { --pc-toast-accent: var(--ink-40); }
.pc-toast--info    { --pc-toast-accent: var(--status-paused); }
.pc-toast--info .pc-toast__eyebrow    { color: var(--status-paused); }
.pc-toast--success { --pc-toast-accent: var(--status-active); }
.pc-toast--success .pc-toast__eyebrow { color: var(--status-active); }
.pc-toast--warning { --pc-toast-accent: var(--status-warning); }
.pc-toast--warning .pc-toast__eyebrow { color: var(--status-warning); }
.pc-toast--danger  { --pc-toast-accent: var(--status-failed); }
.pc-toast--danger .pc-toast__eyebrow  { color: var(--status-failed); }
.pc-toast--neutral { --pc-toast-accent: var(--midnight); }

/* tinted variant - soft pastel wash in the variant accent (Callout-style) */
.pc-toast--tinted {
  background:
    radial-gradient(78% 130% at 0% 0%, color-mix(in srgb, var(--pc-toast-accent) 8%, transparent), transparent 72%),
    var(--paper);
  border-color: color-mix(in srgb, var(--pc-toast-accent) 20%, var(--ink-08));
}

/* depleting progress bar - only for auto-dismissing toasts; pauses on hover */
.pc-toast__progress {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 2px;
}
.pc-toast__progress-bar {
  height: 100%;
  width: 100%;
  background: var(--pc-toast-accent);
  transform-origin: left;
  animation-name: pc-toast-deplete;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
.pc-toast:hover .pc-toast__progress-bar { animation-play-state: paused; }
@keyframes pc-toast-deplete {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .pc-toast__progress { display: none; }
}

/* enter/leave */
.pc-toast-enter-active,
.pc-toast-leave-active { transition: opacity 220ms ease, translate 220ms ease, scale 220ms ease; }
.pc-toast-enter-from { opacity: 0; translate: 0 8px; scale: 0.985; }
.pc-toast-leave-to { opacity: 0; translate: 12px 0; }
.pc-toast-leave-active { position: absolute; }
.pc-toast-move { transition: translate 220ms ease; }
</style>
