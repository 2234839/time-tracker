<template>
  <div v-if="isVisible" class="tree-node">
    <div
      class="project-item"
      :class="{
        active: project.id === selectedProjectId,
        running: isRunning(project.id)
      }"
      :style="{ paddingLeft: level * 16 + 14 + 'px' }"
      @click="$emit('select', project.id)"
    >
      <div class="project-main">
        <button
          v-if="hasChildren"
          class="expand-btn"
          :class="{ expanded: expanded }"
          @click.stop="toggleExpanded"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 4.5L6 7.5L9 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div v-else class="expand-spacer"></div>
        <div class="project-info">
          <span class="project-name" v-html="highlightedName"></span>
          <span class="project-rate">¥{{ project.hourlyRate }}/小时</span>
        </div>
        <div class="project-actions" @click.stop>
          <button
            v-if="isRunning(project.id)"
            class="btn-stop"
            @click="$emit('stop', project.id)"
          >
            停止
          </button>
          <button
            v-else
            class="btn-start"
            @click="$emit('start', project.id)"
          >
            开始
          </button>
          <Dropdown>
            <template #trigger>
              <button class="btn-icon btn-more">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                  <circle cx="3" cy="8" r="1.5" fill="currentColor"/>
                  <circle cx="13" cy="8" r="1.5" fill="currentColor"/>
                </svg>
              </button>
            </template>
            <button class="dropdown-item" @click="$emit('add-sub', project.id)">
              添加子项目
            </button>
            <button class="dropdown-item" @click="$emit('edit', project)">
              编辑
            </button>
            <button class="dropdown-item dropdown-item-danger" @click="$emit('delete', project)">
              删除
            </button>
          </Dropdown>
        </div>
      </div>
      <div v-if="isRunning(project.id)" class="timer-display" :key="refreshKey">
        {{ formatDuration(getDuration(project.id)) }}
      </div>
    </div>

    <div v-if="expanded && hasChildren" class="children">
      <ProjectTreeNode
        v-for="child in filteredChildProjects"
        :key="child.id"
        :project="child"
        :all-projects="allProjects"
        :selected-project-id="selectedProjectId"
        :running-timers="runningTimers"
        :expanded-state="expandedState"
        :level="level + 1"
        :search-query="searchQuery"
        @select="$emit('select', $event)"
        @start="$emit('start', $event)"
        @stop="$emit('stop', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @add-sub="$emit('add-sub', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Project } from '../../../types'
import Dropdown from '../../base/Dropdown.vue'

const props = defineProps<{
  project: Project
  allProjects: Project[]
  selectedProjectId: string | null
  runningTimers: Record<string, number>
  expandedState: Record<string, boolean>
  level: number
  searchQuery?: string
}>()

const emit = defineEmits<{
  select: [id: string]
  start: [id: string]
  stop: [id: string]
  edit: [project: Project]
  delete: [project: Project]
  'add-sub': [parentId: string]
}>()

const expanded = computed({
  get: () => props.expandedState[props.project.id] || false,
  set: (value) => {
    props.expandedState[props.project.id] = value
  }
})
const refreshKey = ref(0)

// 获取子项目
const childProjects = computed(() => {
  return props.allProjects.filter(p => p.parentId === props.project.id)
})

// 检查项目名称是否匹配搜索
const matchesSearch = computed(() => {
  if (!props.searchQuery) return true
  return props.project.name.toLowerCase().includes(props.searchQuery.toLowerCase())
})

// 检查是否有子项目匹配搜索
const hasMatchingDescendants = computed(() => {
  if (!props.searchQuery) return true

  function checkMatches(projectId: string): boolean {
    const children = props.allProjects.filter(p => p.parentId === projectId)
    for (const child of children) {
      if (child.name.toLowerCase().includes(props.searchQuery!.toLowerCase())) {
        return true
      }
      if (checkMatches(child.id)) {
        return true
      }
    }
    return false
  }

  return checkMatches(props.project.id)
})

// 是否可见（匹配搜索或有匹配的后代）
const isVisible = computed(() => {
  if (!props.searchQuery) return true
  return matchesSearch.value || hasMatchingDescendants.value
})

// 过滤后的子项目
const filteredChildProjects = computed(() => {
  if (!props.searchQuery) return childProjects.value

  const query = props.searchQuery.toLowerCase()

  function filterChildren(projectId: string): Project[] {
    const children = props.allProjects.filter(p => p.parentId === projectId)
    const result: Project[] = []

    for (const child of children) {
      const nameMatches = child.name.toLowerCase().includes(query)
      const matchingChildren = filterChildren(child.id)

      if (nameMatches || matchingChildren.length > 0) {
        result.push(child)
      }
    }

    return result
  }

  return filterChildren(props.project.id)
})

const hasChildren = computed(() => {
  return filteredChildProjects.value.length > 0
})

function toggleExpanded() {
  expanded.value = !expanded.value
}

// 高亮匹配的文本
const highlightedName = computed(() => {
  if (!props.searchQuery) return props.project.name

  const regex = new RegExp(`(${escapeRegex(props.searchQuery)})`, 'gi')
  return props.project.name.replace(regex, '<mark>$1</mark>')
})

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isRunning(projectId: string): boolean {
  return projectId in props.runningTimers
}

function getDuration(projectId: string): number {
  const startTime = props.runningTimers[projectId]
  if (!startTime) return 0
  return Date.now() - startTime
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const mins = minutes % 60
  const secs = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 计时器刷新
let timerInterval: number | null = null

onMounted(() => {
  timerInterval = window.setInterval(() => {
    if (Object.keys(props.runningTimers).length > 0) {
      refreshKey.value++
    }
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval !== null) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.project-item {
  padding: 10px 14px;
  padding-right: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
}

.project-item:hover {
  background: #f9f9f9;
}

.project-item.active {
  background: #e8f4ff;
  border-left: 3px solid #007aff;
}

.project-item.running {
  border-left: 3px solid #34c759;
}

.project-item.active.running {
  border-left: 3px solid #007aff;
}

.project-main {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expand-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 0;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.expand-btn:hover {
  background: #f0f0f0;
  border-radius: 4px;
}

.expand-btn.expanded {
  transform: rotate(180deg);
}

.expand-spacer {
  width: 20px;
  flex-shrink: 0;
}

.project-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.project-name {
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-name :deep(mark) {
  background: #ffeb3b;
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

.project-rate {
  font-size: 11px;
  color: #666;
}

.project-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

.btn-start {
  background: #34c759;
  color: #fff;
  padding: 4px 10px;
  font-size: 11px;
}

.btn-start:hover {
  background: #2db84d;
}

.btn-stop {
  background: #ff3b30;
  color: #fff;
  padding: 4px 10px;
  font-size: 11px;
}

.btn-stop:hover {
  background: #d63025;
}

.btn-icon {
  background: transparent;
  color: #007aff;
  padding: 4px 8px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #e8f4ff;
}

.btn-more {
  padding: 4px;
}

.dropdown-item {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item-danger {
  color: #ff3b30;
}

.dropdown-item-danger:hover {
  background: #ffe8e8;
}

.timer-display {
  margin-top: 8px;
  padding-left: 34px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 18px;
  font-weight: 600;
  color: #007aff;
}

.children {
  background: #fafafa;
}
</style>
