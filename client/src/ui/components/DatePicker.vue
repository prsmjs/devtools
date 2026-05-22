<script setup>
import { ref, computed, watch } from "vue"
import {
  CalendarRoot,
  CalendarHeading,
  CalendarGrid,
  CalendarGridHead,
  CalendarGridBody,
  CalendarHeadCell,
  CalendarGridRow,
  CalendarCell,
  CalendarCellTrigger,
  CalendarPrev,
  CalendarNext,
} from "reka-ui"
import { CalendarDate, today, getLocalTimeZone } from "@internationalized/date"
import Popover from "./Popover.vue"

const props = defineProps({
  modelValue: { type: [Date, String, null], default: null },
  placeholder: { type: String, default: "Select date" },
  format: { type: Function, default: null },
  disabled: { type: Boolean, default: false },
  // close the calendar popover once a date is picked
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

const cdKey = (c) => c ? `${c.year}-${c.month}-${c.day}` : null
const dateKey = (d) => {
  if (!d) return null
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const cd = ref(toCD(props.modelValue))
watch(() => props.modelValue, (v) => {
  if (cdKey(cd.value) === dateKey(v)) return
  cd.value = toCD(v)
})
const open = ref(false)

watch(cd, (v) => {
  const next = fromCD(v)
  const same = dateKey(props.modelValue) === (next ? dateKey(next) : null)
  if (same) return
  emit("update:modelValue", next)
  if (props.closeOnSelect && next) open.value = false
})

const formatted = computed(() => {
  const d = fromCD(cd.value)
  if (!d) return ""
  if (props.format) return props.format(d)
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
})

// `placeholder` controls the currently-visible month/year. Bind it so we can jump by year.
const placeholder = ref(cd.value ?? today(getLocalTimeZone()))
watch(cd, (v) => { if (v) placeholder.value = v })
const jumpYear = (delta) => { placeholder.value = placeholder.value.add({ years: delta }) }
</script>

<template>
  <Popover v-model="open" placement="bottom-start" :offset="6">
    <template #trigger>
      <button
        type="button"
        :disabled="disabled"
        :class="['pc-datepicker__trigger', { 'pc-datepicker__trigger--empty': !formatted }]"
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

    <CalendarRoot
      v-slot="{ weekDays, grid }"
      v-model="cd"
      v-model:placeholder="placeholder"
      class="pc-cal"
      :is-date-disabled="() => false"
    >
      <header class="pc-cal__head">
        <button
          type="button"
          class="pc-cal__nav"
          aria-label="Previous year"
          @click="jumpYear(-1)"
        >«</button>
        <CalendarPrev class="pc-cal__nav" aria-label="Previous month">‹</CalendarPrev>
        <CalendarHeading class="pc-cal__heading" />
        <CalendarNext class="pc-cal__nav" aria-label="Next month">›</CalendarNext>
        <button
          type="button"
          class="pc-cal__nav"
          aria-label="Next year"
          @click="jumpYear(1)"
        >»</button>
      </header>
      <CalendarGrid
        v-for="month in grid"
        :key="month.value.toString()"
        class="pc-cal__grid"
      >
        <CalendarGridHead>
          <CalendarGridRow class="pc-cal__row">
            <CalendarHeadCell
              v-for="day in weekDays"
              :key="day"
              class="pc-cal__weekday"
            >{{ day }}</CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody>
          <CalendarGridRow
            v-for="(weekDates, idx) in month.rows"
            :key="idx"
            class="pc-cal__row"
          >
            <CalendarCell
              v-for="date in weekDates"
              :key="date.toString()"
              :date="date"
              class="pc-cal__cell"
            >
              <CalendarCellTrigger
                :day="date"
                :month="month.value"
                class="pc-cal__day"
              />
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </CalendarRoot>
  </Popover>
</template>

<!-- trigger + calendar styles live in style.css so they're available to DateRangePicker
     (which uses the same .pc-datepicker__trigger / .pc-cal classes but ships no styles of its own) -->
