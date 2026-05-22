<script setup>
import { computed } from "vue"
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from "reka-ui"

const props = defineProps({
  modelValue: { type: [Number, Array], default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  disabled: { type: Boolean, default: false },
  // side readout of the current value(s)
  showValue: { type: Boolean, default: false },
  formatValue: { type: Function, default: (v) => String(v) },
  // tick marks: [number] or [{ value, label? }]
  marks: { type: Array, default: () => [] },
  // value bubble that rides above the thumb on hover / drag
  tooltip: { type: Boolean, default: false },
})
const emit = defineEmits(["update:modelValue"])

const isArray = computed(() => Array.isArray(props.modelValue))
const valueArr = computed({
  get: () => isArray.value ? props.modelValue : [props.modelValue],
  set: (v) => emit("update:modelValue", isArray.value ? [...v] : v[0]),
})

const pct = (v) => `${((v - props.min) / (props.max - props.min)) * 100}%`

const normalizedMarks = computed(() =>
  props.marks.map(m => (typeof m === "object" && m !== null) ? m : { value: m, label: "" })
)
const hasMarkLabels = computed(() => normalizedMarks.value.some(m => m.label))
</script>

<template>
  <div class="pc-slider-wrap">
    <div class="pc-slider-main">
      <SliderRoot
        v-model="valueArr"
        class="pc-slider"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
      >
        <SliderTrack class="pc-slider__track">
          <SliderRange class="pc-slider__range" />
        </SliderTrack>

        <span
          v-for="(m, i) in normalizedMarks"
          :key="`tick-${i}`"
          class="pc-slider__tick"
          :style="{ left: pct(m.value) }"
        />

        <SliderThumb
          v-for="(_, i) in valueArr"
          :key="i"
          class="pc-slider__thumb"
        >
          <span v-if="tooltip" class="pc-slider__bubble">{{ formatValue(valueArr[i]) }}</span>
        </SliderThumb>
      </SliderRoot>

      <div v-if="hasMarkLabels" class="pc-slider__marks">
        <span
          v-for="(m, i) in normalizedMarks"
          :key="`label-${i}`"
          class="pc-slider__mark-label"
          :style="{ left: pct(m.value) }"
        >{{ m.label }}</span>
      </div>
    </div>

    <div v-if="showValue" class="pc-slider__readout">
      <template v-if="isArray">
        {{ formatValue(valueArr[0]) }} - {{ formatValue(valueArr[valueArr.length - 1]) }}
      </template>
      <template v-else>
        {{ formatValue(valueArr[0]) }}
      </template>
    </div>
  </div>
</template>

<style scoped>
.pc-slider-wrap { display: flex; align-items: center; gap: 12px; width: 100%; }
.pc-slider-main { flex: 1; }

.pc-slider {
  position: relative;
  display: flex;
  align-items: center;
  user-select: none;
  touch-action: none;
  width: 100%;
  height: 20px;
}
.pc-slider[data-disabled] { opacity: 0.5; }
.pc-slider__track {
  position: relative;
  flex-grow: 1;
  height: 4px;
  background: var(--ink-08);
  border-radius: 999px;
  overflow: hidden;
}
.pc-slider__range {
  position: absolute;
  height: 100%;
  background: var(--midnight);
}

/* tick marks */
.pc-slider__tick {
  position: absolute;
  top: 50%;
  width: 2px;
  height: 8px;
  border-radius: 1px;
  background: var(--ink-20);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.pc-slider__thumb {
  position: relative;
  display: block;
  width: 16px;
  height: 16px;
  background: var(--paper);
  border: 2px solid var(--midnight);
  border-radius: 999px;
  outline: none;
  transition: box-shadow 140ms ease, transform 80ms ease;
  cursor: grab;
}
.pc-slider__thumb:hover { transform: scale(1.08); }
.pc-slider__thumb:focus-visible { box-shadow: var(--focus-ring); }
.pc-slider__thumb:active { cursor: grabbing; }

/* value bubble */
.pc-slider__bubble {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--midnight);
  color: var(--paper-on-dark);
  font-family: var(--display);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.11px;
  padding: 3px 7px;
  border-radius: var(--radius-sharp);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease;
}
.pc-slider__bubble::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--midnight);
}
.pc-slider__thumb:hover .pc-slider__bubble,
.pc-slider__thumb:focus-visible .pc-slider__bubble,
.pc-slider__thumb:active .pc-slider__bubble { opacity: 1; }

/* mark labels */
.pc-slider__marks {
  position: relative;
  height: 14px;
  margin-top: 4px;
}
.pc-slider__mark-label {
  position: absolute;
  transform: translateX(-50%);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--ink-60);
  white-space: nowrap;
}

.pc-slider__readout {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--ink-60);
  min-width: 60px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
