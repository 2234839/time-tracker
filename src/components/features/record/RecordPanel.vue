<template>
  <div class="record-panel">
    <div v-if="displayProjects.length === 0" class="empty-state">
      请选择一个项目或开始计时
    </div>

    <Tabs v-else :tabs="tabLabels" v-model="activeTabIndex" scrollable>
      <template #tab="{ tab }">
        <span class="tab-label">{{ tab }}</span>
        <span v-if="isRunning(displayProjects[tabLabels.indexOf(tab)].id)" class="tab-indicator"></span>
      </template>

      <TabPanel v-for="proj in displayProjects" :key="proj.id" :active="activeTabIndex === displayProjects.indexOf(proj)">
        <div class="panel-header">
          <div class="project-title">
            <h2>{{ proj.name }}</h2>
            <span class="current-rate">当前费率: ¥{{ proj.hourlyRate }}/小时</span>
          </div>
        </div>

        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">总时长</span>
            <span class="stat-value">{{ formatDuration(getProjectStats(proj.id).totalDuration) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总费用</span>
            <span class="stat-value">¥{{ getProjectStats(proj.id).totalCost.toFixed(2) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">记录数</span>
            <span class="stat-value">{{ getProjectStats(proj.id).recordCount }}</span>
          </div>
        </div>

        <div class="records-section">
          <div class="section-header">
            <span>时间记录</span>
            <button v-if="selectedIds.size > 0" class="btn-sm btn-secondary" @click="handleBatchEdit">
              批量编辑 ({{ selectedIds.size }})
            </button>
          </div>

          <div class="records-list">
            <div
              v-for="record in getProjectRecords(proj.id)"
              :key="record.id"
              class="record-item"
              :class="{ selected: selectedIds.has(record.id) }"
            >
              <div class="record-checkbox">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(record.id)"
                  @change="toggleSelect(record.id)"
                />
              </div>
              <div class="record-main">
                <div class="record-time">
                  <span class="time-start">{{ formatDateTime(record.startTime) }}</span>
                  <span class="time-separator">→</span>
                  <span class="time-end">
                    {{ record.endTime ? formatDateTime(record.endTime) : '进行中' }}
                  </span>
                </div>
                <div class="record-duration">
                  {{ record.endTime ? formatDuration(record.endTime - record.startTime) : '进行中' }}
                </div>
              </div>
              <div class="record-details">
                <span class="record-rate">¥{{ record.hourlyRate }}/小时</span>
                <span v-if="record.endTime" class="record-cost">
                  ¥{{ calculateCost(record).toFixed(2) }}
                </span>
              </div>
              <div class="record-note">{{ record.note || '-' }}</div>
              <div class="record-actions">
                <button class="btn-icon" @click="$emit('editRecord', record)">编辑</button>
                <button class="btn-icon btn-icon-danger" @click="$emit('deleteRecord', record)">删除</button>
              </div>
            </div>
            <div v-if="getProjectRecords(proj.id).length === 0" class="empty-state">
              暂无时间记录
            </div>
          </div>
        </div>
      </TabPanel>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Project, TimeRecord } from '../../../types'
import Tabs from '../../base/Tabs.vue'
import TabPanel from '../../base/TabPanel.vue'

const props = defineProps<{
  allProjects: Project[]
  allRecords: TimeRecord[]
  selectedProjectId: string | null
  runningTimers: Record<string, number>
}>()

const emit = defineEmits<{
  editRecord: [record: TimeRecord]
  deleteRecord: [record: TimeRecord]
  batchEdit: [ids: string[]]
}>()

const selectedIds = ref<Set<string>>(new Set())
const activeTabIndex = ref(0)

// 获取需要显示的项目：正在运行的项目 + 选中的项目
const displayProjects = computed(() => {
  const runningIds = new Set(Object.keys(props.runningTimers))
  const projects: Project[] = []

  // 添加正在运行的项目
  for (const project of props.allProjects) {
    if (runningIds.has(project.id)) {
      projects.push(project)
    }
  }

  // 添加选中的项目（如果不在运行列表中）
  if (props.selectedProjectId && !runningIds.has(props.selectedProjectId)) {
    const selectedProject = props.allProjects.find(p => p.id === props.selectedProjectId)
    if (selectedProject) {
      projects.push(selectedProject)
    }
  }

  return projects
})

// tab 标签
const tabLabels = computed(() => displayProjects.value.map(p => p.name))

// 当 displayProjects 变化时，确保 activeTabIndex 有效
computed(() => {
  const projects = displayProjects.value
  if (activeTabIndex.value >= projects.length && projects.length > 0) {
    activeTabIndex.value = 0
  }
  return projects
})

function isRunning(projectId: string): boolean {
  return projectId in props.runningTimers
}

function getProjectRecords(projectId: string): TimeRecord[] {
  return props.allRecords.filter(r => r.projectId === projectId)
    .sort((a, b) => b.startTime - a.startTime)
}

function getProjectStats(projectId: string) {
  const records = getProjectRecords(projectId)
  const totalDuration = records.reduce((sum, r) => {
    if (r.endTime === null) return sum
    return sum + (r.endTime - r.startTime)
  }, 0)

  const totalCost = records.reduce((sum, r) => {
    if (r.endTime === null) return sum
    const duration = r.endTime - r.startTime
    const hours = duration / (1000 * 60 * 60)
    return sum + (hours * r.hourlyRate)
  }, 0)

  return {
    totalDuration,
    totalCost,
    recordCount: records.length,
  }
}

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

function handleBatchEdit() {
  emit('batchEdit', Array.from(selectedIds.value))
  selectedIds.value.clear()
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}小时${minutes}分钟`
}

function calculateCost(record: TimeRecord): number {
  if (!record.endTime) return 0
  const duration = record.endTime - record.startTime
  const hours = duration / (1000 * 60 * 60)
  return hours * record.hourlyRate
}
</script>

<style scoped>
.record-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 13px;
}

.tab-label {
  flex: 1;
}

.tab-indicator {
  width: 6px;
  height: 6px;
  background: #34c759;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.panel-header {
  padding: 14px 18px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.project-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-title h2 {
  font-size: 16px;
  font-weight: 600;
}

.current-rate {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 12px;
}

.stats {
  display: flex;
  gap: 20px;
  padding: 14px 18px;
  background: #f9f9f9;
  border-bottom: 1px solid #e0e0e0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.records-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.records-list {
  flex: 1;
  overflow-y: auto;
}

.record-item {
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  gap: 12px;
  padding: 10px 18px;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
}

.record-item:hover {
  background: #fafafa;
}

.record-item.selected {
  background: #e8f4ff;
}

.record-checkbox input {
  width: auto;
  cursor: pointer;
}

.record-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.time-start,
.time-end {
  color: #333;
}

.time-separator {
  color: #999;
}

.record-duration {
  font-size: 11px;
  color: #666;
}

.record-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
}

.record-rate {
  font-size: 11px;
  color: #666;
}

.record-cost {
  font-size: 13px;
  font-weight: 600;
  color: #007aff;
}

.record-note {
  font-size: 12px;
  color: #666;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  background: transparent;
  color: #007aff;
  padding: 4px 8px;
  font-size: 11px;
}

.btn-icon:hover {
  background: #e8f4ff;
}

.btn-icon-danger {
  color: #ff3b30;
}

.btn-icon-danger:hover {
  background: #ffe8e8;
}
</style>
