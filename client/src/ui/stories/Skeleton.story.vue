<script setup>
import Skeleton from "../components/Skeleton.vue"
import Card from "../components/Card.vue"
</script>

<template>
  <Story title="Skeleton">
    <Variant title="Variants">
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 480px;">
        <Skeleton variant="text" />
        <Skeleton variant="text" :lines="3" />
        <Skeleton variant="rect" height="120px" />
        <div style="display: flex; gap: 12px; align-items: center;">
          <Skeleton variant="circle" :size="44" />
          <div style="flex: 1;">
            <Skeleton variant="text" />
            <Skeleton variant="text" width="60%" />
          </div>
        </div>
      </div>
    </Variant>

    <Variant title="Card placeholder">
      <Card padded style="max-width: 360px;">
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
          <Skeleton variant="circle" :size="40" />
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
        </div>
        <Skeleton variant="rect" height="140px" />
        <div style="margin-top: 12px;">
          <Skeleton variant="text" :lines="2" />
        </div>
      </Card>
    </Variant>

    <Variant title="Pulse animation">
      <div style="display: flex; flex-direction: column; gap: 12px; max-width: 480px;">
        <Skeleton variant="text" animation="pulse" />
        <Skeleton variant="rect" height="80px" animation="pulse" />
      </div>
    </Variant>
  </Story>
</template>
