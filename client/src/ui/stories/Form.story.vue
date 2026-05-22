<script setup>
import { ref } from "vue"
import Input from "../components/Input.vue"
import Textarea from "../components/Textarea.vue"
import Select from "../components/Select.vue"
import Checkbox from "../components/Checkbox.vue"
import Switch from "../components/Switch.vue"
import RadioGroup from "../components/RadioGroup.vue"
import Field from "../components/Field.vue"
import Button from "../components/Button.vue"

const name = ref("")
const email = ref("")
const bio = ref("")
const role = ref("admin")
const subscribed = ref(true)
const notif = ref(false)
const plan = ref("pro")
const roles = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
]
const plans = ["free", "pro", "enterprise"]
</script>

<template>
  <Story title="Forms">
    <Variant title="Inputs and labels">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 720px;">
        <Field label="Name" required>
          <Input v-model="name" placeholder="Jane Cooper" />
        </Field>
        <Field label="Email" hint="We never share it." required>
          <Input v-model="email" type="email" placeholder="jane@example.com" />
        </Field>
        <Field label="Bio" style="grid-column: span 2;">
          <Textarea v-model="bio" placeholder="A short description..." :rows="4" />
        </Field>
        <Field label="Role">
          <Select v-model="role" :options="roles" />
        </Field>
        <Field label="Plan">
          <Select v-model="plan" :options="plans" />
        </Field>
      </div>
    </Variant>
    <Variant title="Toggles">
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <Checkbox v-model="subscribed" label="Subscribe to weekly updates" />
        <Checkbox :modelValue="true" label="Always required" disabled />
        <Switch v-model="notif" label="Push notifications" />
        <RadioGroup v-model="role" :options="roles" />
      </div>
    </Variant>
    <Variant title="Validation">
      <Field label="API key" error="Must be a valid hex string" required>
        <Input :modelValue="'xyz'" invalid />
      </Field>
    </Variant>
    <Variant title="Submit row">
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary">Save changes</Button>
      </div>
    </Variant>
  </Story>
</template>
