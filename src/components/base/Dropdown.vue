<template>
  <div class="dropdown" :class="{ open }" ref="target">
    <div @click="toggle">
      <slot name="trigger" :toggle="toggle" :open="open"></slot>
    </div>
    <div class="dropdown-menu">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'

const open = ref(false)
const target = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

onClickOutside(target, close)

defineExpose({
  close
})
</script>

<style scoped>
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 120px;
  z-index: 100;
  display: none;
  overflow: hidden;
}

.dropdown.open .dropdown-menu {
  display: block;
}
</style>
