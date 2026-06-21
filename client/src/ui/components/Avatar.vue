<script setup>
import { computed } from "vue"

const props = defineProps({
  name: { type: String, default: "" },
  src: { type: String, default: "" },
  alt: { type: String, default: "" },
  size: { type: String, default: "md" }, // xs | sm | md | lg | xl
  shape: { type: String, default: "circle" }, // circle | square
  /**
   * tone: visual style of the placeholder when no image is shown.
   *   dark    midnight bg + white text  (default, matches active nav)
   *   neutral ink-04 bg + ink text       (calm, recedes)
   *   invert  paper bg + ink text + 1px border  (very subtle)
   *   lavender lavender bg + midnight text     (the one soft accent allowed in palette)
   */
  tone: { type: String, default: "dark" },
  // renders as a real <button> with hover, focus ring, and the same active push-down
  // as Button - for avatars that open a menu or navigate
  interactive: { type: Boolean, default: false },
})

const initials = computed(() => {
  if (!props.name) return ""
  const parts = props.name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
})
</script>

<template>
  <component
    :is="interactive ? 'button' : 'span'"
    :type="interactive ? 'button' : undefined"
    :class="['pc-avatar', `pc-avatar--${size}`, `pc-avatar--${shape}`, `pc-avatar--${tone}`, { 'pc-avatar--interactive': interactive }]"
    :aria-label="alt || name || undefined"
    :role="interactive ? undefined : 'img'"
  >
    <img v-if="src" :src="src" :alt="alt || name" class="pc-avatar__img" />
    <slot v-else>
      <span v-if="initials" class="pc-avatar__initials">{{ initials }}</span>
      <span v-else class="pc-avatar__fallback" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none">
          <circle cx="12" cy="9" r="3.5" stroke="currentColor" stroke-width="1.6"/>
          <path d="M4.5 19c1.4-3.2 4.3-5 7.5-5s6.1 1.8 7.5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </span>
    </slot>
  </component>
</template>

<style scoped>
.pc-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-family: var(--display);
  font-weight: 500;
  letter-spacing: -0.5px;
  user-select: none;
  line-height: 1;
  box-sizing: border-box;
}
.pc-avatar__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pc-avatar__initials { font-variant-numeric: tabular-nums; }

/* interactive: a real button that pushes down on press like Button */
.pc-avatar--interactive {
  appearance: none;
  border: 0;
  padding: 0;
  margin: 0;
  cursor: pointer;
  outline: none;
  transition: box-shadow 140ms ease, transform 60ms ease;
}
.pc-avatar--interactive:hover { box-shadow: 0 0 0 3px var(--ink-08); }
.pc-avatar--interactive:focus-visible { box-shadow: var(--focus-ring); }
.pc-avatar--interactive:active { transform: translateY(1.5px); }
/* the invert tone already carries an inset border ring - keep it on hover/focus */
.pc-avatar--interactive.pc-avatar--invert:hover { box-shadow: inset 0 0 0 1px var(--ink-20), 0 0 0 3px var(--ink-08); }
.pc-avatar--interactive.pc-avatar--invert:focus-visible { box-shadow: inset 0 0 0 1px var(--ink-08), var(--focus-ring); }

@media (prefers-reduced-motion: reduce) {
  .pc-avatar--interactive { transition: box-shadow 140ms ease; }
}

/* sizes */
.pc-avatar--xs { width: 20px; height: 20px; font-size: 9px;  letter-spacing: -0.2px; }
.pc-avatar--sm { width: 24px; height: 24px; font-size: 10px; letter-spacing: -0.2px; }
.pc-avatar--md { width: 32px; height: 32px; font-size: 12px; letter-spacing: -0.3px; }
.pc-avatar--lg { width: 44px; height: 44px; font-size: 16px; letter-spacing: -0.4px; }
.pc-avatar--xl { width: 64px; height: 64px; font-size: 22px; letter-spacing: -0.6px; }

/* shapes - sharp 4px square or full circle per design spec */
.pc-avatar--circle { border-radius: 999px; }
.pc-avatar--square { border-radius: var(--radius-sharp); }

/* tones - solid surfaces, no gradients */
.pc-avatar--dark {
  background: var(--midnight);
  color: var(--paper-on-dark);
}
.pc-avatar--neutral {
  background: var(--ink-04);
  color: var(--ink);
}
.pc-avatar--invert {
  background: var(--paper);
  color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--ink-08);
}
.pc-avatar--lavender {
  background: var(--lavender);
  color: var(--midnight);
}
</style>
