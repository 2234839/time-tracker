<template>
  <div v-show="active" class="tab-panel">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean
}>()
</script>

<style scoped>
.tab-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
