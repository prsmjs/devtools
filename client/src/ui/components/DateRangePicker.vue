<script setup>
import { ref, computed, watch } from "vue"
import {
  RangeCalendarRoot,
  RangeCalendarHeading,
  RangeCalendarGrid,
  RangeCalendarGridHead,
  RangeCalendarGridBody,
  RangeCalendarHeadCell,
  RangeCalendarGridRow,
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  RangeCalendarPrev,
  RangeCalendarNext,
} from "reka-ui"
import { CalendarDate, today, getLocalTimeZone } from "@internationalized/date"
import Popover from "./Popover.vue"

const props = defineProps({
  // { start: Date|string, end: Date|string } | null
  modelValue: { type: Object, default: null },
  placeholder: { type: String, default: "Select date range" },
  format: { type: Function, default: null },
  disabled: { type: Boolean, default: false },
  // close the calendar popover once a full range (both ends) is picked
  closeOnSelect: { type: Boolean, default: true },
})
const emit = defineEmits(["update:modelValue"])

const toCD = (d) => {
  if (!d) return undefined
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return undefined
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}
const fromCD = (cd) => cd ? new Date(cd.year, cd.month - 1, cd.day) : null

const cdKey = (cd) => cd ? `${cd.year}-${cd.month}-${cd.day}` : null
const dateKey = (d) => {
  if (!d) return null
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const open = ref(false)

const range = ref({
  start: toCD(props.modelValue?.start),
  end: toCD(props.modelValue?.end),
})

// only re-sync from props if values actually differ (avoid ping-pong)
watch(() => props.modelValue, (v) => {
  const sameStart = cdKey(range.value?.start) === dateKey(v?.start)
  const sameEnd = cdKey(range.value?.end) === dateKey(v?.end)
  if (sameStart && sameEnd) return
  range.value = { start: toCD(v?.start), end: toCD(v?.end) }
})

// emit only when selection is complete or fully cleared; ignore intermediate (start-only) state
watch(range, (v) => {
  const hasStart = !!v?.start
  const hasEnd = !!v?.end
  if (hasStart && hasEnd) {
    emit("update:modelValue", { start: fromCD(v.start), end: fromCD(v.end) })
    if (props.closeOnSelect) open.value = false
  } else if (!hasStart && !hasEnd) {
    emit("update:modelValue", null)
  }
}, { deep: true })

const fmtOne = (d) => {
  if (!d) return ""
  if (props.format) return props.format(d)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

const formatted = computed(() => {
  const s = fromCD(range.value?.start)
  const e = fromCD(range.value?.end)
  if (!s && !e) return ""
  if (s && e) return `${fmtOne(s)} - ${fmtOne(e)}`
  return `${fmtOne(s)} -`
})

const rangePlaceholder = ref(
  toCD(props.modelValue?.start) ?? toCD(props.modelValue?.end) ?? today(getLocalTimeZone())
)
watch(range, (v) => {
  if (v?.start) rangePlaceholder.value = v.start
})
const jumpYear = (delta) => {
  rangePlaceholder.value = rangePlaceholder.value.add({ years: delta })
}
</script>

<template>
  <Popover v-model="open" placement="bottom-start" :offset="6">
    <template #trigger>
      <button
        type="button"
        :disabled="disabled"
        :class="['pc-datepicker__trigger', { 'pc-datepicker__trigger--empty': !formatted }]"
        style="min-width: 280px;"
      >
        <span class="pc-datepicker__icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="2.5" width="11" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/>
            <path d="M1.5 5.5h11M4.5 1.5v2M9.5 1.5v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="pc-datepicker__value">{{ formatted || placeholder }}</span>
      </button>
    </template>

    <RangeCalendarRoot
      v-slot="{ weekDays, grid }"
      v-model="range"
      v-model:placeholder="rangePlaceholder"
      class="pc-cal"
    >
      <header class="pc-cal__head">
        <button type="button" class="pc-cal__nav" aria-label="Previous year" @click="jumpYear(-1)">«</button>
        <RangeCalendarPrev class="pc-cal__nav" aria-label="Previous month">‹</RangeCalendarPrev>
        <RangeCalendarHeading class="pc-cal__heading" />
        <RangeCalendarNext class="pc-cal__nav" aria-label="Next month">›</RangeCalendarNext>
        <button type="button" class="pc-cal__nav" aria-label="Next year" @click="jumpYear(1)">»</button>
      </header>
      <RangeCalendarGrid
        v-for="month in grid"
        :key="month.value.toString()"
        class="pc-cal__grid"
      >
        <RangeCalendarGridHead>
          <RangeCalendarGridRow class="pc-cal__row">
            <RangeCalendarHeadCell
              v-for="day in weekDays"
              :key="day"
              class="pc-cal__weekday"
            >{{ day }}</RangeCalendarHeadCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridHead>
        <RangeCalendarGridBody>
          <RangeCalendarGridRow
            v-for="(weekDates, idx) in month.rows"
            :key="idx"
            class="pc-cal__row"
          >
            <RangeCalendarCell
              v-for="date in weekDates"
              :key="date.toString()"
              :date="date"
              class="pc-cal__cell"
            >
              <RangeCalendarCellTrigger
                :day="date"
                :month="month.value"
                class="pc-cal__day"
              />
            </RangeCalendarCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridBody>
      </RangeCalendarGrid>
    </RangeCalendarRoot>
  </Popover>
</template>
