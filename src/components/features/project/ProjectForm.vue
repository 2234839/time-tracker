<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-group">
      <label for="name">项目名称</label>
      <input
        id="name"
        v-model="formData.name"
        type="text"
        placeholder="输入项目名称"
        required
      />
    </div>
    <div v-if="showParentSelect" class="form-group">
      <label for="parent">父项目</label>
      <select
        id="parent"
        v-model="formData.parentId"
        class="select-input"
      >
        <option value="">无（顶级项目）</option>
        <option v-for="p in availableParentProjects" :key="p.id" :value="p.id">
          {{ getProjectPath(p) }}
        </option>
      </select>
    </div>
    <div class="form-group">
      <label for="rate">每小时费用（元）</label>
      <input
        id="rate"
        v-model.number="formData.hourlyRate"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        required
      />
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" @click="$emit('cancel')">取消</button>
      <button type="submit" class="btn-primary">
        {{ project ? '保存' : '创建' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Project } from '../../../types'

const props = defineProps<{
  project?: Project | null
  allProjects: Project[]
  defaultParentId?: string | null  // 默认父项目 ID（用于创建子项目）
}>()

const emit = defineEmits<{
  submit: [data: { name: string; hourlyRate: number; parentId: string | null }]
  cancel: []
}>()

const formData = ref({
  name: '',
  hourlyRate: 0,
  parentId: null as string | null
})

// 是否显示父项目选择器（创建新项目或编辑时有父项目）
const showParentSelect = computed(() => {
  return !props.project || props.project.parentId !== null || props.allProjects.some(p => p.parentId === null)
})

// 可选的父项目列表（排除自己和自己的后代）
const availableParentProjects = computed(() => {
  if (props.project) {
    // 编辑模式：排除自己和自己的后代
    const getDescendantIds = (projectId: string): string[] => {
      const children = props.allProjects.filter(p => p.parentId === projectId)
      const ids = children.map(c => c.id)
      children.forEach(c => {
        ids.push(...getDescendantIds(c.id))
      })
      return ids
    }
    const excludeIds = [props.project.id, ...getDescendantIds(props.project.id)]
    return props.allProjects.filter(p => !excludeIds.includes(p.id))
  }
  return props.allProjects
})

// 获取项目路径（显示层级）
function getProjectPath(project: Project): string {
  const path: string[] = [project.name]
  let current = project
  while (current.parentId) {
    const parent = props.allProjects.find(p => p.id === current.parentId)
    if (parent) {
      path.unshift(parent.name)
      current = parent
    } else {
      break
    }
  }
  return path.join(' / ')
}

watch(() => props.project, (project) => {
  if (project) {
    formData.value = {
      name: project.name,
      hourlyRate: project.hourlyRate,
      parentId: project.parentId
    }
  }
}, { immediate: true })

// 当 defaultParentId 变化时更新
watch(() => props.defaultParentId, (parentId) => {
  if (parentId !== undefined) {
    formData.value.parentId = parentId
  }
}, { immediate: true })

function handleSubmit() {
  if (!formData.value.name || formData.value.name.trim() === '') {
    return
  }
  emit('submit', {
    name: formData.value.name,
    hourlyRate: formData.value.hourlyRate,
    parentId: formData.value.parentId || null
  })
}
</script>

<style scoped>
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  margin-bottom: 6px;
}

.select-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
}

.select-input:focus {
  outline: none;
  border-color: #007aff;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
