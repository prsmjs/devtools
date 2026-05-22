<script setup>
import { ref } from "vue"
import TagInput from "../components/TagInput.vue"
import Field from "../components/Field.vue"

const tags = ref(["eviction", "denver", "tenant-counsel"])
const emails = ref([])
const validateEmail = (v) => /.+@.+\..+/.test(v) || "Must be a valid email"
</script>

<template>
  <Story title="TagInput">
    <Variant title="Free-text tags">
      <div style="max-width: 480px;">
        <Field label="Tags" hint="Enter or comma to add. Backspace to remove.">
          <TagInput v-model="tags" placeholder="Add a tag..." />
        </Field>
      </div>
    </Variant>

    <Variant title="With validation">
      <div style="max-width: 480px;">
        <Field label="Email recipients">
          <TagInput
            v-model="emails"
            placeholder="someone@example.com"
            :validate="validateEmail"
          />
        </Field>
      </div>
    </Variant>

    <Variant title="Limited (max 3)">
      <div style="max-width: 480px;">
        <TagInput :modelValue="['one', 'two', 'three']" :maxTags="3" />
      </div>
    </Variant>
  </Story>
</template>
