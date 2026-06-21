<script setup>
import { ref, computed, useSlots, watch, nextTick, onUnmounted } from "vue"
import { Icon } from "@iconify/vue"

const props = defineProps({
  variant: { type: String, default: "primary" }, // primary | outline | ghost | glass | subtle | danger
  size: { type: String, default: "md" }, // sm | md | lg
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  // optional label shown while loading (e.g. "Saving"); falls back to the slot
  loadingLabel: { type: String, default: "" },
  // minimum time the loading state stays visible once shown, so a fast async
  // action still flashes the spinner/label instead of jittering. set 0 to disable
  minLoadingMs: { type: Number, default: 400 },
  // optional trailing mono chip, e.g. "+ Notes"
  hint: { type: String, default: "" },
  // iconify icon name, e.g. "lucide:settings" - icon-only when no slot content
  icon: { type: String, default: "" },
  type: { type: String, default: "button" },
})

const slots = useSlots()
// icon + no label -> a perfect-square icon button
const iconOnly = computed(() => !!props.icon && !slots.default)

// loading shown to the user. follows props.loading on, but holds on for at least
// minLoadingMs before turning off so a quick async action stays visible
const loadingShown = ref(props.loading)
let loadingStart = 0
let releaseTimer = null

watch(() => props.loading, (on) => {
  if (on) {
    if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null }
    loadingStart = performance.now()
    loadingShown.value = true
    return
  }
  const remaining = props.minLoadingMs - (performance.now() - loadingStart)
  if (remaining <= 0) {
    loadingShown.value = false
    return
  }
  releaseTimer = setTimeout(() => {
    loadingShown.value = false
    releaseTimer = null
  }, remaining)
})

onUnmounted(() => { if (releaseTimer) clearTimeout(releaseTimer) })

const btnRef = ref(null)
let cancelWidthAnim = null

// animate the button's width whenever loading toggles, so the spinner appearing
// and an optional label swap resize the button smoothly instead of jumping.
// skipped for icon-only buttons - they are fixed squares.
watch(loadingShown, async () => {
  const el = btnRef.value
  if (!el || iconOnly.value) return

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  if (reduce) return

  if (cancelWidthAnim) cancelWidthAnim()

  const from = el.getBoundingClientRect().width
  el.style.width = `${from}px`

  await nextTick() // let the spinner + label update

  el.style.transition = "none"
  el.style.width = "auto"
  const to = el.getBoundingClientRect().width
  el.style.width = `${from}px`
  void el.offsetWidth
  el.style.transition = ""

  if (Math.abs(to - from) < 0.5) {
    el.style.width = ""
    return
  }

  el.style.width = `${to}px`

  let done = false
  const finish = () => {
    if (done) return
    done = true
    el.style.width = ""
    el.removeEventListener("transitionend", onEnd)
    clearTimeout(fallback)
    cancelWidthAnim = null
  }
  const onEnd = (e) => { if (e.propertyName === "width") finish() }
  const fallback = setTimeout(finish, 500)
  cancelWidthAnim = finish
  el.addEventListener("transitionend", onEnd)
})
</script>

<template>
  <button
    ref="btnRef"
    :type="type"
    :disabled="disabled || loadingShown"
    :aria-busy="loadingShown || undefined"
    :class="[
      'pc-btn',
      `pc-btn--${variant}`,
      `pc-btn--${size}`,
      { 'pc-btn--loading': loadingShown, 'pc-btn--icon': iconOnly },
    ]"
  >
    <!-- icon-only: just the icon, or a spinner while loading -->
    <template v-if="iconOnly">
      <span v-if="loadingShown" class="pc-btn__spinner pc-btn__spinner--solo" aria-hidden="true" />
      <Icon v-else :icon="icon" class="pc-btn__icon" aria-hidden="true" />
    </template>

    <!-- label button: collapsible spinner, optional leading icon, label, hint -->
    <template v-else>
      <span class="pc-btn__spinner-wrap" :class="{ 'pc-btn__spinner-wrap--on': loadingShown }" aria-hidden="true">
        <span class="pc-btn__spinner" />
      </span>
      <Icon v-if="icon" :icon="icon" class="pc-btn__icon" aria-hidden="true" />
      <span class="pc-btn__label">
        <Transition name="pc-btn-roll">
          <span v-if="loadingShown && loadingLabel" key="load" class="pc-btn__label-text">{{ loadingLabel }}</span>
          <span v-else key="idle" class="pc-btn__label-text"><slot /></span>
        </Transition>
      </span>
      <span v-if="hint" class="pc-btn__hint">{{ hint }}</span>
    </template>
  </button>
</template>

<style scoped>
.pc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  min-height: var(--control-h);
  border-radius: var(--radius-sharp);
  font-family: var(--display);
  font-size: 14px;
  letter-spacing: -0.14px;
  font-weight: 500;
  border: 1px solid transparent;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease,
              opacity 140ms ease, box-shadow 140ms ease, transform 60ms ease,
              width 240ms cubic-bezier(0.22, 1, 0.36, 1);
  white-space: nowrap;
  line-height: 1.2;
  outline: none;
  user-select: none;
  overflow: hidden;
}
.pc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pc-btn--loading:disabled { opacity: 1; cursor: progress; }
.pc-btn:focus-visible { box-shadow: var(--focus-ring); }
.pc-btn:active:not(:disabled) { transform: translateY(1.5px); }

/* icon-only: a perfect square, width matched to each size's height */
.pc-btn--icon { width: var(--control-h); padding: 0; }
.pc-btn--icon.pc-btn--sm { width: var(--control-h-sm); }
.pc-btn--icon.pc-btn--lg { width: var(--control-h-lg); }

.pc-btn--primary { background: var(--midnight); color: var(--paper-on-dark); }
.pc-btn--primary:hover:not(:disabled) { background: var(--midnight-hover); }
.pc-btn--primary:active:not(:disabled) { background: var(--midnight-active); }
.pc-btn--primary:focus-visible { box-shadow: var(--focus-ring); }

/* outline - transparent with a visible border, the in-between weight */
.pc-btn--outline { background: transparent; color: var(--ink); border-color: var(--ink-08); }
.pc-btn--outline:hover:not(:disabled) { background: var(--ink-04); border-color: var(--ink-20); }
.pc-btn--outline:active:not(:disabled) { background: var(--ink-08); }

/* ghost - truly chrome-less, no border, only a faint hover fill */
.pc-btn--ghost { background: transparent; color: var(--ink-60); border-color: transparent; }
.pc-btn--ghost:hover:not(:disabled) { background: var(--ink-04); color: var(--ink); }
.pc-btn--ghost:active:not(:disabled) { background: var(--ink-08); }

.pc-btn--subtle { background: var(--ink-04); color: var(--ink); }
.pc-btn--subtle:hover:not(:disabled) { background: var(--ink-08); }
.pc-btn--subtle:active:not(:disabled) { background: rgba(0, 0, 0, 0.12); }

.pc-btn--glass {
  background: var(--paper-on-dark-12);
  color: var(--paper-on-dark);
  border-color: var(--paper-on-dark-12);
}
.pc-btn--glass:hover:not(:disabled) { background: rgba(255, 255, 255, 0.20); border-color: rgba(255, 255, 255, 0.24); }
.pc-btn--glass:active:not(:disabled) { background: rgba(255, 255, 255, 0.28); }
.pc-btn--glass:focus-visible { box-shadow: var(--focus-ring-on-dark); }

/* danger - subtle tinted fill, no border, for destructive / rejecting actions */
.pc-btn--danger {
  background: rgba(179, 38, 30, 0.06);
  color: var(--status-failed);
  border-color: transparent;
}
.pc-btn--danger:hover:not(:disabled) { background: rgba(179, 38, 30, 0.12); }
.pc-btn--danger:active:not(:disabled) { background: rgba(179, 38, 30, 0.18); }
.pc-btn--danger:focus-visible { box-shadow: var(--focus-ring-danger); }

.pc-btn--sm { padding: 0 10px; min-height: var(--control-h-sm); font-size: 13px; }
.pc-btn--lg { padding: 0 18px; min-height: var(--control-h-lg); font-size: 15px; }

.pc-btn__label { position: relative; display: inline-flex; align-items: center; white-space: nowrap; }
.pc-btn__label-text { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }

/* the loading label rolls up into place, matching CodeBlock's copy swap. the
   leaving label is taken out of flow so the entering label defines the width -
   otherwise the button's width animation measures the wrong target and stutters */
.pc-btn-roll-enter-active,
.pc-btn-roll-leave-active { transition: opacity 175ms ease, transform 175ms ease; }
.pc-btn-roll-leave-active { position: absolute; top: 0; left: 0; }
.pc-btn-roll-enter-from { opacity: 0; transform: translateY(7px); }
.pc-btn-roll-leave-to { opacity: 0; transform: translateY(-7px); }
@media (prefers-reduced-motion: reduce) {
  .pc-btn-roll-enter-active,
  .pc-btn-roll-leave-active { transition: none; }
}

/* icon */
.pc-btn__icon { font-size: 16px; flex-shrink: 0; }
.pc-btn--sm .pc-btn__icon { font-size: 15px; }
.pc-btn--lg .pc-btn__icon { font-size: 18px; }

/* trailing mono hint chip, e.g. "+ Notes" */
.pc-btn__hint {
  font-family: var(--mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: var(--badge-radius);
  background: var(--ink-04);
  color: var(--ink-60);
  flex-shrink: 0;
}
.pc-btn--primary .pc-btn__hint,
.pc-btn--glass .pc-btn__hint {
  background: rgba(255, 255, 255, 0.16);
  color: var(--paper-on-dark-60);
}

/* spinner lives in a collapsible wrapper. margin-left -8px cancels the button's
   flex gap while collapsed. width/margin snap instantly - the button's own JS
   width animation is the single source of the resize. only opacity is transitioned. */
.pc-btn__spinner-wrap {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  width: 0;
  margin-left: -8px;
  opacity: 0;
  transition: opacity 160ms ease;
}
.pc-btn__spinner-wrap--on {
  width: 12px;
  margin-left: 0;
  opacity: 1;
}
.pc-btn__spinner {
  width: 12px; height: 12px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  opacity: 0.8;
  flex-shrink: 0;
}
.pc-btn__spinner-wrap--on .pc-btn__spinner,
.pc-btn__spinner--solo {
  animation: pc-btn-spin 700ms linear infinite;
}
@keyframes pc-btn-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .pc-btn { transition: background 140ms ease, color 140ms ease, border-color 140ms ease,
                        opacity 140ms ease, box-shadow 140ms ease; }
  .pc-btn__spinner-wrap { transition: opacity 120ms ease; }
}
</style>
