<script setup>
import { computed, ref, watch, onMounted } from "vue"
import { PinInputRoot, PinInputInput } from "reka-ui"

const props = defineProps({
  modelValue: { type: String, default: "" },
  length: { type: Number, default: 6 },
  // mask the entered characters (password-style dots)
  mask: { type: Boolean, default: false },
  type: { type: String, default: "text" }, // text | number
  size: { type: String, default: "md" }, // sm | md | lg
  disabled: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  // one-time-code autofill (autocomplete="one-time-code")
  otp: { type: Boolean, default: true },
  placeholder: { type: String, default: "" },
  autofocus: { type: Boolean, default: false },
})
const emit = defineEmits(["update:modelValue", "complete"])

const rootRef = ref(null)

// reka works with a string[]; the public model is the joined code string
const cells = computed({
  get: () => Array.from({ length: props.length }, (_, i) => props.modelValue[i] ?? ""),
  set: (v) => emit("update:modelValue", v.join("")),
})
// reka can re-fire @complete when the v-model round-trips back as a still-full
// value - only emit once per transition into the complete state
let lastComplete = null
const onComplete = (v) => {
  const joined = v.join("")
  if (joined === lastComplete) return
  lastComplete = joined
  emit("complete", joined)
}
watch(() => props.modelValue, (v) => {
  if ((v?.length ?? 0) < props.length) lastComplete = null
})

onMounted(() => {
  if (props.autofocus) {
    rootRef.value?.$el?.querySelector?.("input")?.focus?.()
  }
})
</script>

<template>
  <PinInputRoot
    ref="rootRef"
    v-model="cells"
    :mask="mask"
    :otp="otp"
    :type="type"
    :disabled="disabled"
    :placeholder="placeholder"
    :class="['pc-pin', `pc-pin--${size}`, { 'pc-pin--invalid': invalid, 'pc-pin--disabled': disabled }]"
    @complete="onComplete"
  >
    <PinInputInput
      v-for="i in length"
      :key="i"
      :index="i - 1"
      class="pc-pin__cell"
    />
  </PinInputRoot>
</template>

<style scoped>
.pc-pin {
  display: inline-flex;
  gap: 8px;
}
.pc-pin__cell {
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background: var(--paper);
  text-align: center;
  font-family: var(--display);
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0;
  outline: none;
  caret-color: var(--midnight);
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
  padding: 0;
}
.pc-pin__cell:hover:not(:focus):not(:disabled) { border-color: var(--ink-20); }
.pc-pin__cell:focus { border-color: var(--midnight); box-shadow: var(--focus-ring); }

/* sizes */
.pc-pin--sm .pc-pin__cell { width: 34px; height: 40px; font-size: 16px; }
.pc-pin--md .pc-pin__cell { width: 44px; height: 50px; font-size: 20px; }
.pc-pin--lg .pc-pin__cell { width: 52px; height: 60px; font-size: 24px; }

/* invalid */
.pc-pin--invalid .pc-pin__cell { border-color: var(--status-failed); }
.pc-pin--invalid .pc-pin__cell:focus { border-color: var(--status-failed); box-shadow: var(--focus-ring-danger); }

/* disabled */
.pc-pin--disabled .pc-pin__cell {
  background: var(--ink-04);
  color: var(--ink-60);
  cursor: not-allowed;
}
</style>
