<script setup>
import { computed } from "vue"

const props = defineProps({
  href: { type: String, default: null },
  // arrow direction
  arrow: { type: String, default: "right" }, // right | left | up-right
  // uppercase monospace styling (the "ALL →" card-header look)
  mono: { type: Boolean, default: false },
  size: { type: String, default: "md" }, // sm | md
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(["click"])

const tag = computed(() => props.href ? "a" : "button")

// arrow drawn centered on the vertical axis (y=8 of a 16x16 viewBox)
const arrowPath = computed(() => ({
  right: "M3 8h9M8.5 4l4 4-4 4",
  left: "M13 8H4M7.5 4l-4 4 4 4",
  "up-right": "M5 11L11 5M6 5h5v5",
}[props.arrow] || "M3 8h9M8.5 4l4 4-4 4"))
</script>

<template>
  <component
    :is="tag"
    :href="disabled ? undefined : href"
    :type="tag === 'button' ? 'button' : undefined"
    :disabled="tag === 'button' ? disabled : undefined"
    :aria-disabled="disabled || undefined"
    :class="[
      'pc-arrow-link',
      `pc-arrow-link--${size}`,
      { 'pc-arrow-link--mono': mono, 'pc-arrow-link--disabled': disabled },
    ]"
    @click="!disabled && emit('click', $event)"
  >
    <span
      v-if="arrow === 'left'"
      class="pc-arrow-link__arrow pc-arrow-link__arrow--left"
      aria-hidden="true"
    >
      <svg class="pc-arrow-link__icon" viewBox="0 0 16 16" fill="none">
        <path :d="arrowPath" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <span class="pc-arrow-link__label"><slot /></span>
    <span
      v-if="arrow !== 'left'"
      :class="['pc-arrow-link__arrow', `pc-arrow-link__arrow--${arrow}`]"
      aria-hidden="true"
    >
      <svg class="pc-arrow-link__icon" viewBox="0 0 16 16" fill="none">
        <path :d="arrowPath" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  </component>
</template>

<style scoped>
.pc-arrow-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: 0;
  padding: 2px 2px;
  margin: -2px -2px;
  border-radius: 3px;
  color: var(--ink-60);
  font-family: var(--display);
  letter-spacing: -0.14px;
  cursor: pointer;
  outline: none;
  text-decoration: none;
  transition: color 140ms ease, box-shadow 140ms ease;
}
.pc-arrow-link--md { font-size: 14px; }
.pc-arrow-link--sm { font-size: 13px; }

.pc-arrow-link:hover { color: var(--ink); }
.pc-arrow-link:focus-visible { box-shadow: var(--focus-ring); }
.pc-arrow-link--disabled { color: var(--ink-40); cursor: not-allowed; }

/* mono / uppercase card-header style */
.pc-arrow-link--mono {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}
.pc-arrow-link--mono.pc-arrow-link--md { font-size: 11px; }
.pc-arrow-link--mono.pc-arrow-link--sm { font-size: 10px; }

/* arrow wrapper - flex-centered against the text */
.pc-arrow-link__arrow {
  display: inline-flex;
  align-items: center;
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.pc-arrow-link__icon {
  width: 1em;
  height: 1em;
  display: block;
}

/* the nudge - arrow drifts in its own direction on hover/focus */
.pc-arrow-link:hover .pc-arrow-link__arrow--right,
.pc-arrow-link:focus-visible .pc-arrow-link__arrow--right { transform: translateX(3px); }

.pc-arrow-link:hover .pc-arrow-link__arrow--left,
.pc-arrow-link:focus-visible .pc-arrow-link__arrow--left { transform: translateX(-3px); }

.pc-arrow-link:hover .pc-arrow-link__arrow--up-right,
.pc-arrow-link:focus-visible .pc-arrow-link__arrow--up-right { transform: translate(2px, -2px); }

/* on press, the arrow snaps back to its origin - confirms the action fired */
.pc-arrow-link:active:not(.pc-arrow-link--disabled) .pc-arrow-link__arrow { transform: none; }

.pc-arrow-link--disabled .pc-arrow-link__arrow { transform: none !important; }

@media (prefers-reduced-motion: reduce) {
  .pc-arrow-link__arrow { transition: none; }
}
</style>
