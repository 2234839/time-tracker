<template>
  <div class="tabs">
    <div class="tabs-header" :class="{ 'tabs-scrollable': scrollable }">
      <div
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab-button"
        :class="{ active: modelValue === index }"
        @click="$emit('update:modelValue', index)"
      >
        <slot name="tab" :tab="tab" :index="index">
          {{ tab }}
        </slot>
      </div>
    </div>
    <div class="tabs-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  tabs: string[]
  modelValue: number
  scrollable?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<style scoped>
.tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tabs-header {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.tabs-scrollable {
  overflow-x: auto;
  scrollbar-width: thin;
}

.tabs-scrollable::-webkit-scrollbar {
  height: 4px;
}

.tabs-scrollable::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 2px;
}

.tab-button {
  flex-shrink: 0;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-button:hover {
  background: #f5f5f5;
}

.tab-button.active {
  background: #007aff;
  color: #fff;
  border-color: #007aff;
}

.tabs-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
