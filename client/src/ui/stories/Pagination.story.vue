<script setup>
import { ref } from "vue"
import Pagination from "../components/Pagination.vue"

const page = ref(3)
const size = ref(25)
</script>

<template>
  <Story title="Pagination">
    <Variant title="Many pages">
      <Pagination
        :page="page"
        :page-size="size"
        :total="2480"
        @update:page="p => page = p"
        @update:pageSize="s => size = s"
      />
    </Variant>
    <Variant title="Few pages">
      <Pagination
        :page="page"
        :page-size="10"
        :total="34"
        @update:page="p => page = p"
      />
    </Variant>
    <Variant title="Empty">
      <Pagination :page="1" :page-size="25" :total="0" />
    </Variant>
  </Story>
</template>
