<template>
  <ResizablePane storage-key="sidebar-width" :min-width="200" :max-width="600">
    <div class="project-list">
      <div class="list-header">
        <span>项目</span>
        <div class="header-actions">
          <div class="search-box">
            <svg width="14" height="14" viewBox="0 0 14 14" class="search-icon">
              <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <path d="M9 9L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索项目..."
              class="search-input"
            />
            <button
              v-if="searchQuery"
              class="search-clear"
              @click="searchQuery = ''"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <button class="btn-icon btn-add" @click="$emit('add')" title="新建项目">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M8 2V14M2 8H14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="projects">
        <ProjectTreeNode
          v-for="project in sortedProjects"
          :key="project.id"
          :project="project"
          :all-projects="projects"
          :selected-project-id="selectedProjectId"
          :running-timers="runningTimers"
          :expanded-state="expandedState"
          :level="0"
          :search-query="searchQuery"
          @select="$emit('select', $event)"
          @start="$emit('start', $event)"
          @stop="$emit('stop', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @add-sub="$emit('add-sub', $event)"
        />
        <div v-if="sortedProjects.length === 0" class="empty-state">
          {{ searchQuery ? '没有找到匹配的项目' : '暂无项目，点击上方"新建项目"创建' }}
        </div>
      </div>
    </div>
  </ResizablePane>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Project } from '../../../types'
import ProjectTreeNode from './ProjectTreeNode.vue'
import ResizablePane from '../../base/ResizablePane.vue'

const props = defineProps<{
  projects: Project[]
  selectedProjectId: string | null
  runningTimers: Record<string, number>
}>()

// 项目展开状态持久化
const expandedState = useStorage<Record<string, boolean>>('project-expanded', {})

// 搜索关键词
const searchQuery = ref('')

const emit = defineEmits<{
  select: [id: string]
  start: [id: string]
  stop: [id: string]
  edit: [project: Project]
  delete: [project: Project]
  'add-sub': [parentId: string]
  add: []
}>()

// 按最近使用时间排序
const sortedProjects = computed(() => {
  const topLevel = props.projects.filter(p => p.parentId === null)
  return topLevel.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
})

// 搜索时自动展开所有项目
watch(searchQuery, (newQuery) => {
  if (newQuery) {
    // 搜索时展开所有项目
    props.projects.forEach(p => {
      expandedState.value[p.id] = true
    })
  }
})
</script>

<style scoped>
.project-list {
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 8px;
  color: #999;
  pointer-events: none;
}

.search-input {
  padding: 5px 8px 5px 28px;
  font-size: 11px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  color: #333;
  width: 140px;
  transition: width 0.15s;
}

.search-input:focus {
  outline: none;
  border-color: #007aff;
  width: 160px;
}

.search-input::placeholder {
  color: #999;
}

.search-clear {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.search-clear:hover {
  background: #f0f0f0;
  color: #666;
}

.btn-add {
  padding: 4px;
  color: #007aff;
}

.btn-add:hover {
  background: #e8f4ff;
  border-radius: 4px;
}

.projects {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.empty-state {
  padding: 30px 14px;
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>
