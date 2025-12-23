<template>
  <div class="resizable-pane" :class="{ resizing: isResizing }" :style="{ width: width + 'px' }">
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="pane-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useStorage } from '@vueuse/core'

const props = defineProps<{
  storageKey: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
}>()

const width = useStorage<number>(props.storageKey, props.defaultWidth ?? 280)

const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

const minWidth = props.minWidth ?? 200
const maxWidth = props.maxWidth ?? 600

function startResize(e: MouseEvent) {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = width.value
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!isResizing.value) return
  const diff = e.clientX - startX.value
  const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.value + diff))
  width.value = newWidth
}

function stopResize() {
  isResizing.value = false
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped>
.resizable-pane {
  position: relative;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s;
}

.resizable-pane.resizing {
  box-shadow: 2px 0 8px rgba(0, 122, 255, 0.15);
}

.pane-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.resize-handle {
  position: absolute;
  right: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
}

.resize-handle:hover {
  background: rgba(0, 122, 255, 0.3);
}

.resizable-pane.resizing .resize-handle {
  background: rgba(0, 122, 255, 0.5);
}
</style>
