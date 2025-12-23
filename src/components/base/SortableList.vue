<template>
  <div class="sortable-list">
    <div
      v-for="(item, index) in items"
      :key="item[itemKey]"
      class="sortable-item"
      :class="{
        dragging: draggingIndex === index,
        'drag-over': dragOverIndex === index && draggingIndex !== index
      }"
      :data-index="index"
      @dragover="handleDragOver(index, $event)"
      @dragleave="handleDragLeave"
      @drop="handleDrop(index, $event)"
    >
      <div
        class="drag-handle"
        draggable="true"
        @dragstart="handleDragStart(index, $event)"
        @dragend="handleDragEnd"
      >
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="3" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="3" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="3" cy="11" r="1.5" fill="currentColor"/>
          <circle cx="7" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="7" cy="11" r="1.5" fill="currentColor"/>
          <circle cx="11" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="11" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="11" cy="11" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <div class="sortable-content">
        <slot :item="item" :index="index"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  items: any[]
  itemKey: string
}>()

const emit = defineEmits<{
  'update:items': [items: any[]]
}>()

const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function handleDragStart(index: number, event: DragEvent) {
  draggingIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    // 设置拖拽数据，某些浏览器需要
    event.dataTransfer.setData('text/plain', index.toString())
  }
}

function handleDragEnd() {
  draggingIndex.value = null
  dragOverIndex.value = null
}

function handleDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  if (draggingIndex.value !== index) {
    dragOverIndex.value = index
  }
}

function handleDragLeave() {
  dragOverIndex.value = null
}

function handleDrop(targetIndex: number, event: DragEvent) {
  event.preventDefault()
  const fromIndex = draggingIndex.value
  if (fromIndex === null || fromIndex === targetIndex) {
    handleDragEnd()
    return
  }

  const newItems = [...props.items]
  const [movedItem] = newItems.splice(fromIndex, 1)
  newItems.splice(targetIndex, 0, movedItem)

  emit('update:items', newItems)
  handleDragEnd()
}
</script>

<style scoped>
.sortable-list {
  display: flex;
  flex-direction: column;
}

.sortable-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
}

.sortable-item.dragging {
  opacity: 0.5;
}

.sortable-item.drag-over {
  border-top: 2px solid #007aff;
}

.sortable-content {
  flex: 1;
  min-width: 0;
}

.drag-handle {
  flex-shrink: 0;
  color: #999;
  cursor: grab;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.drag-handle:hover {
  background: #e8e8e8;
  color: #666;
}

.drag-handle:active {
  cursor: grabbing;
}
</style>
