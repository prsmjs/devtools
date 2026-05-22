<script setup>
import Spinner from "../components/Spinner.vue"
import Kbd from "../components/Kbd.vue"
import Divider from "../components/Divider.vue"
import EmptyState from "../components/EmptyState.vue"
import Button from "../components/Button.vue"
</script>

<template>
  <Story title="Misc">
    <Variant title="Spinner">
      <div style="display: flex; gap: 16px; align-items: center;">
        <Spinner :size="14" />
        <Spinner :size="20" />
        <div class="pc-dark" style="padding: 12px;"><Spinner :size="14" light /></div>
      </div>
    </Variant>
    <Variant title="Kbd">
      <div>Press <Kbd>⌘</Kbd> + <Kbd>K</Kbd> to open the command palette.</div>
    </Variant>
    <Variant title="Divider">
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div>Above</div>
        <Divider />
        <div>Below</div>
      </div>
    </Variant>
    <Variant title="EmptyState">
      <EmptyState icon="∅" title="No runs yet" description="When an intake starts, it'll show up here.">
        <Button variant="primary">Start a run</Button>
      </EmptyState>
    </Variant>
  </Story>
</template>
