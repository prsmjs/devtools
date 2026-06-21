<script setup>
import { computed, ref } from "vue"
import Popover from "./Popover.vue"
import Avatar from "./Avatar.vue"
import ScrollArea from "./ScrollArea.vue"

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  // tenants: [{ value, name, sublabel? }]
  tenants: { type: Array, default: () => [] },
  // optional mono label above the trigger, e.g. "Workspace"
  label: { type: String, default: "" },
  placement: { type: String, default: "bottom-start" },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(["update:modelValue", "select"])

const active = computed(() =>
  props.tenants.find(t => t.value === props.modelValue) ?? props.tenants[0] ?? null
)

const open = ref(false)
const choose = (t) => {
  emit("update:modelValue", t.value)
  emit("select", t)
  open.value = false
}
</script>

<template>
  <div class="pc-tenant">
    <div v-if="label" class="pc-tenant__label">{{ label }}</div>
    <Popover v-model="open" block :placement="placement" :offset="6">
      <template #trigger>
        <button
          type="button"
          class="pc-tenant__trigger"
          :class="{ 'pc-tenant__trigger--open': open }"
          :disabled="disabled"
        >
          <Avatar
            v-if="active"
            :name="active.monogram ? '' : active.name"
            shape="square"
            tone="dark"
            size="md"
          >
            <template v-if="active.monogram">{{ active.monogram }}</template>
          </Avatar>
          <span class="pc-tenant__text">
            <span class="pc-tenant__name">{{ active?.name ?? "Select…" }}</span>
            <span v-if="active?.sublabel" class="pc-tenant__sub">{{ active.sublabel }}</span>
          </span>
          <span class="pc-tenant__chevron" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M5 6.5l3-3 3 3M5 9.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
      </template>

      <template #default="{ close }">
        <div class="pc-tenant__menu">
          <ScrollArea max-height="288px">
            <div class="pc-tenant__list">
              <button
                v-for="t in tenants"
                :key="t.value"
                type="button"
                class="pc-tenant__item"
                :class="{ 'pc-tenant__item--active': t.value === modelValue }"
                @click="choose(t)"
              >
                <Avatar
                  :name="t.monogram ? '' : t.name"
                  shape="square"
                  tone="dark"
                  size="sm"
                >
                  <template v-if="t.monogram">{{ t.monogram }}</template>
                </Avatar>
                <span class="pc-tenant__text">
                  <span class="pc-tenant__name">{{ t.name }}</span>
                  <span v-if="t.sublabel" class="pc-tenant__sub">{{ t.sublabel }}</span>
                </span>
                <span v-if="t.value === modelValue" class="pc-tenant__check" aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7.5L6 11l5.5-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </button>
            </div>
          </ScrollArea>
          <div v-if="$slots.footer" class="pc-tenant__footer">
            <slot name="footer" :close="close" />
          </div>
        </div>
      </template>
    </Popover>
  </div>
</template>

<style scoped>
.pc-tenant { width: 100%; }
.pc-tenant__label {
  font-family: var(--mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
  font-weight: 500;
  color: var(--ink-60);
  margin-bottom: 6px;
  padding: 0 2px;
}

.pc-tenant__trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--radius-sharp);
  background: transparent;
  border: 1px solid var(--ink-08);
  cursor: pointer;
  outline: none;
  text-align: left;
  transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 60ms ease;
}
.pc-tenant__trigger:hover:not(:disabled) { background: var(--ink-04); border-color: var(--ink-20); }
.pc-tenant__trigger--open { background: var(--ink-04); border-color: var(--ink-20); }
.pc-tenant__trigger:active:not(:disabled) { background: var(--ink-08); border-color: var(--ink-20); transform: translateY(1px); }
.pc-tenant__trigger:focus-visible { box-shadow: var(--focus-ring); border-color: var(--midnight); }
.pc-tenant__trigger:disabled { opacity: 0.5; cursor: not-allowed; }

.pc-tenant__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}
.pc-tenant__name {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.16px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-tenant__sub {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-60);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-tenant__chevron {
  display: inline-flex;
  color: var(--ink-40);
  flex-shrink: 0;
}

/* dropdown - offsets the Popover's default padding for a clean menu */
.pc-tenant__menu {
  margin: -12px;
  min-width: 220px;
}
.pc-tenant__list { padding: 4px; display: flex; flex-direction: column; gap: 2px; }
.pc-tenant__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border-radius: var(--radius-sharp);
  background: transparent;
  border: 0;
  cursor: pointer;
  outline: none;
  text-align: left;
  transition: background 120ms ease;
}
.pc-tenant__item:hover { background: var(--ink-04); }
.pc-tenant__item:focus-visible { background: var(--ink-04); box-shadow: var(--focus-ring); }
.pc-tenant__item:active { background: var(--ink-08); }
.pc-tenant__check { display: inline-flex; color: var(--ink); flex-shrink: 0; }

.pc-tenant__footer {
  border-top: 1px solid var(--ink-08);
  padding: 6px;
}
</style>
