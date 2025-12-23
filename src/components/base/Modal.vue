<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" ref="overlayRef">
        <div class="modal-content" ref="contentRef">
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button class="modal-close" @click="$emit('close')">×</button>
          </div>
          <div class="modal-body">
            <slot></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  show: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()

const overlayRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const mouseDownInside = ref(false)

function handleMouseDown(event: MouseEvent) {
  mouseDownInside.value = contentRef.value?.contains(event.target as Node) ?? false
}

function handleClick(event: MouseEvent) {
  // 只有点击 overlay 且 mousedown 也在 overlay 上时才关闭
  if (
    event.target === overlayRef.value &&
    !mouseDownInside.value
  ) {
    emit('close')
  }
}

watch(() => props.show, (show) => {
  if (show) {
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('click', handleClick)
  } else {
    document.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('click', handleClick)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleMouseDown)
  document.removeEventListener('click', handleClick)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  max-height: 90%;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  font-size: 15px;
  font-weight: 600;
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 18px;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
