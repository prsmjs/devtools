<script setup>
import { ref } from "vue"
import { logEvent } from "histoire/client"
import PinInput from "../components/PinInput.vue"
import Field from "../components/Field.vue"

const code = ref("")
const fourDigit = ref("")
const masked = ref("")
const verifyCode = ref("")
const verified = ref(false)

const onComplete = (value) => {
  verified.value = value === "424242"
  logEvent("complete", { code: value })
}
</script>

<template>
  <Story title="PinInput">
    <Variant title="Six digit">
      <Field label="Verification code" hint="Enter the 6-digit code we sent you">
        <PinInput
          v-model="code"
          :length="6"
          type="number"
          @complete="(c) => logEvent('complete', { code: c })"
          @update:modelValue="(v) => logEvent('update:modelValue', { value: v })"
        />
      </Field>
      <p style="margin-top: 12px; font-size: 13px; color: var(--ink-60);">
        Value: <code>{{ code || "-" }}</code> - check the Events tab as you type.
      </p>
    </Variant>

    <Variant title="Four digit">
      <Field label="PIN">
        <PinInput
          v-model="fourDigit"
          :length="4"
          type="number"
          @complete="(c) => logEvent('complete', { code: c })"
        />
      </Field>
    </Variant>

    <Variant title="Masked">
      <Field label="Security PIN" hint="Characters are hidden as you type">
        <PinInput
          v-model="masked"
          :length="4"
          type="number"
          mask
          @complete="(c) => logEvent('complete', { code: c })"
        />
      </Field>
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <PinInput :length="4" size="sm" type="number" @complete="(c) => logEvent('complete', { code: c })" />
        <PinInput :length="4" size="md" type="number" @complete="(c) => logEvent('complete', { code: c })" />
        <PinInput :length="4" size="lg" type="number" @complete="(c) => logEvent('complete', { code: c })" />
      </div>
    </Variant>

    <Variant title="Invalid">
      <Field label="Verification code" error="That code is incorrect or expired">
        <PinInput :modelValue="'1234'" :length="4" type="number" invalid />
      </Field>
    </Variant>

    <Variant title="Disabled">
      <PinInput :modelValue="'159'" :length="6" type="number" disabled />
    </Variant>

    <Variant title="Verify flow (try 424242)">
      <Field label="Two-factor code" :error="verifyCode.length === 6 && !verified ? 'Incorrect code' : ''">
        <PinInput
          v-model="verifyCode"
          :length="6"
          type="number"
          :invalid="verifyCode.length === 6 && !verified"
          @complete="onComplete"
        />
      </Field>
      <p v-if="verified" style="margin-top: 12px; font-size: 13px; color: var(--status-active); display: flex; align-items: center; gap: 6px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--status-active);" />
        Code verified
      </p>
    </Variant>
  </Story>
</template>
