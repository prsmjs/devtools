<script setup>
import { ref } from "vue"

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: "Add..." },
  disabled: { type: Boolean, default: false },
  // characters that, when typed, will commit the current draft as a tag
  delimiters: { type: Array, default: () => [",", "Enter", "Tab"] },
  // when true, trim each tag and skip duplicates
  unique: { type: Boolean, default: true },
  maxTags: { type: Number, default: 0 }, // 0 = unlimited
  // optional validator(string) -> boolean | string ("string" = error message)
  validate: { type: Function, default: null },
})
const emit = defineEmits(["update:modelValue", "add", "remove", "invalid"])

const draft = ref("")
const inputRef = ref(null)
const errorMsg = ref("")

const commit = () => {
  const raw = draft.value.trim()
  if (!raw) return
  if (props.maxTags > 0 && props.modelValue.length >= props.maxTags) return
  if (props.unique && props.modelValue.includes(raw)) {
    errorMsg.value = "Already added"
    emit("invalid", raw, "duplicate")
    return
  }
  if (props.validate) {
    const res = props.validate(raw)
    if (res !== true) {
      errorMsg.value = typeof res === "string" ? res : "Invalid"
      emit("invalid", raw, errorMsg.value)
      return
    }
  }
  emit("update:modelValue", [...props.modelValue, raw])
  emit("add", raw)
  draft.value = ""
  errorMsg.value = ""
}

const removeAt = (i) => {
  const next = props.modelValue.slice()
  const [removed] = next.splice(i, 1)
  emit("update:modelValue", next)
  emit("remove", removed)
}

const onKeydown = (e) => {
  if (props.delimiters.includes(e.key)) {
    if (draft.value.trim()) {
      e.preventDefault()
      commit()
    }
    return
  }
  if (e.key === "Backspace" && !draft.value && props.modelValue.length) {
    removeAt(props.modelValue.length - 1)
  }
}

const onPaste = (e) => {
  const text = e.clipboardData?.getData("text") || ""
  if (!text.includes(",") && !text.includes("\n")) return
  e.preventDefault()
  const parts = text.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
  for (const p of parts) {
    draft.value = p
    commit()
  }
}

const focus = () => inputRef.value?.focus()
defineExpose({ focus })
</script>

<template>
  <div
    :class="['pc-taginput', { 'pc-taginput--disabled': disabled, 'pc-taginput--invalid': !!errorMsg }]"
    @click="focus"
  >
    <span
      v-for="(tag, i) in modelValue"
      :key="i"
      class="pc-taginput__tag"
    >
      <span class="pc-taginput__tag-label">{{ tag }}</span>
      <button
        type="button"
        class="pc-taginput__tag-remove"
        :disabled="disabled"
        :aria-label="`Remove ${tag}`"
        @click.stop="removeAt(i)"
      >
        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
        </svg>
      </button>
    </span>
    <input
      ref="inputRef"
      v-model="draft"
      :placeholder="modelValue.length ? '' : placeholder"
      :disabled="disabled || (maxTags > 0 && modelValue.length >= maxTags)"
      class="pc-taginput__input"
      @keydown="onKeydown"
      @blur="commit"
      @paste="onPaste"
    />
  </div>
  <div v-if="errorMsg" class="pc-taginput__error">{{ errorMsg }}</div>
</template>

<style scoped>
.pc-taginput {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: var(--control-h);
  padding: 3px 4px 3px 6px;
  border: 1px solid var(--ink-08);
  border-radius: var(--radius-sharp);
  background: var(--paper);
  cursor: text;
  transition: border-color 140ms ease, box-shadow 140ms ease;
  font-family: var(--display);
  letter-spacing: -0.14px;
}
.pc-taginput:hover:not(.pc-taginput--disabled):not(:focus-within) { border-color: var(--ink-20); }
.pc-taginput:focus-within { border-color: var(--midnight); box-shadow: var(--focus-ring); }
.pc-taginput--disabled { background: var(--ink-04); cursor: not-allowed; opacity: 0.6; }
.pc-taginput--invalid { border-color: var(--status-failed); }
.pc-taginput--invalid:focus-within { border-color: var(--status-failed); box-shadow: var(--focus-ring-danger); }

.pc-taginput__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 8px;
  background: var(--ink-04);
  border-radius: 3px;
  font-size: 12px;
  color: var(--ink);
  max-width: 220px;
  line-height: 1.4;
}
.pc-taginput__tag-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-taginput__tag-remove {
  width: 16px; height: 16px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 3px;
  color: var(--ink-60);
  font-size: 13px;
  line-height: 1;
  transition: background 120ms ease, color 120ms ease;
}
.pc-taginput__tag-remove:hover { background: var(--ink-08); color: var(--ink); }

.pc-taginput__input {
  flex: 1;
  min-width: 80px;
  border: 0;
  outline: none;
  background: transparent;
  font-family: var(--display);
  font-size: 14px;
  letter-spacing: -0.14px;
  color: var(--ink);
  padding: 4px 6px;
  min-height: 24px;
}
.pc-taginput__input::placeholder { color: var(--ink-40); }

.pc-taginput__error {
  margin-top: 4px;
  font-size: 12px;
  color: var(--status-failed);
}
</style>
