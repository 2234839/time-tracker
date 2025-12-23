<template>
  <div class="app">
    <div class="content">
      <ProjectList
        :projects="store.projects"
        :selected-project-id="selectedProjectId"
        :running-timers="store.timer.activeTimers"
        @select="selectedProjectId = $event"
        @start="handleStartTimer"
        @stop="handleStopTimer"
        @edit="handleEditProject"
        @delete="handleDeleteProject"
        @add-sub="handleAddSubProject"
        @add="showAddProject = true"
      />

      <RecordPanel
        :all-projects="store.projects"
        :all-records="store.records"
        :selected-project-id="selectedProjectId"
        :running-timers="store.timer.activeTimers"
        @edit-record="handleEditRecord"
        @delete-record="handleDeleteRecord"
        @batch-edit="handleBatchEdit"
      />
    </div>

    <!-- 新建项目模态框 -->
    <Modal :show="showAddProject" title="新建项目" @close="showAddProject = false">
      <ProjectForm
        :all-projects="store.projects"
        @submit="handleAddProject"
        @cancel="showAddProject = false"
      />
    </Modal>

    <!-- 添加子项目模态框 -->
    <Modal :show="showAddSubProject" title="添加子项目" @close="showAddSubProject = false">
      <ProjectForm
        :all-projects="store.projects"
        :default-parent-id="parentProjectId"
        @submit="handleAddProject"
        @cancel="showAddSubProject = false"
      />
    </Modal>

    <!-- 编辑项目模态框 -->
    <Modal :show="showEditProject" title="编辑项目" @close="showEditProject = false">
      <ProjectForm
        :project="editingProject"
        :all-projects="store.projects"
        @submit="handleUpdateProject"
        @cancel="showEditProject = false"
      />
    </Modal>

    <!-- 编辑记录模态框 -->
    <Modal :show="showEditRecord" title="编辑记录" @close="showEditRecord = false">
      <RecordForm
        :record="editingRecord"
        @submit="handleUpdateRecord"
        @cancel="showEditRecord = false"
      />
    </Modal>

    <!-- 批量编辑模态框 -->
    <Modal :show="showBatchEdit" title="批量编辑" @close="showBatchEdit = false">
      <BatchEditForm
        :record-ids="batchEditIds"
        @submit="handleBatchUpdate"
        @cancel="showBatchEdit = false"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { store } from './stores/store'
import ProjectList from './components/features/project/ProjectList.vue'
import RecordPanel from './components/features/record/RecordPanel.vue'
import Modal from './components/base/Modal.vue'
import ProjectForm from './components/features/project/ProjectForm.vue'
import RecordForm from './components/features/record/RecordForm.vue'
import BatchEditForm from './components/features/record/BatchEditForm.vue'
import type { Project, TimeRecord } from './types'

const selectedProjectId = ref<string | null>(null)
const showAddProject = ref(false)
const showAddSubProject = ref(false)
const showEditProject = ref(false)
const showEditRecord = ref(false)
const showBatchEdit = ref(false)
const editingProject = ref<Project | null>(null)
const editingRecord = ref<TimeRecord | null>(null)
const batchEditIds = ref<string[]>([])
const parentProjectId = ref<string | null>(null)

onMounted(async () => {
  await store.init()
})

async function handleStartTimer(projectId: string) {
  await store.startTimer(projectId)
  selectedProjectId.value = projectId
}

async function handleStopTimer(projectId: string) {
  await store.stopTimer(projectId)
}

function handleEditProject(project: Project) {
  editingProject.value = project
  showEditProject.value = true
}

async function handleDeleteProject(project: Project) {
  const descendants = store.getAllDescendants(project.id)
  const count = descendants.length + 1
  const message = count > 1
    ? `确定要删除项目"${project.name}"吗？这将同时删除该项目的 ${count} 个项目（包括所有子项目）和相关的时间记录。`
    : `确定要删除项目"${project.name}"吗？这将同时删除所有相关的时间记录。`

  if (confirm(message)) {
    await store.deleteProject(project.id)
    if (selectedProjectId.value === project.id) {
      selectedProjectId.value = null
    }
  }
}

async function handleAddProject(data: { name: string; hourlyRate: number; parentId?: string | null }) {
  await store.addProject(data.name, data.hourlyRate, data.parentId || null)
  showAddProject.value = false
  showAddSubProject.value = false
  parentProjectId.value = null
}

function handleAddSubProject(parentId: string) {
  parentProjectId.value = parentId
  showAddSubProject.value = true
}

async function handleUpdateProject(data: { name: string; hourlyRate: number; parentId?: string | null }) {
  if (editingProject.value) {
    await store.updateProject(editingProject.value.id, data)
    showEditProject.value = false
    editingProject.value = null
  }
}

function handleEditRecord(record: TimeRecord) {
  editingRecord.value = record
  showEditRecord.value = true
}

async function handleDeleteRecord(record: TimeRecord) {
  if (confirm('确定要删除这条记录吗？')) {
    await store.deleteRecord(record.id)
  }
}

function handleBatchEdit(ids: string[]) {
  batchEditIds.value = ids
  showBatchEdit.value = true
}

async function handleUpdateRecord(data: { startTime: number; endTime: number | null; hourlyRate: number; note: string }) {
  if (editingRecord.value) {
    await store.updateRecord(editingRecord.value.id, data)
    showEditRecord.value = false
    editingRecord.value = null
  }
}

async function handleBatchUpdate(data: { hourlyRate?: number; note?: string }) {
  await store.batchUpdateRecords(batchEditIds.value, data)
  showBatchEdit.value = false
  batchEditIds.value = []
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  color: #333;
  background: #f5f5f5;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

button {
  font-family: inherit;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background: #007aff;
  color: #fff;
}

.btn-primary:hover {
  background: #0051d5;
}

.btn-secondary {
  background: #e5e5e5;
  color: #333;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

.btn-danger {
  background: #ff3b30;
  color: #fff;
}

.btn-danger:hover {
  background: #d63025;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

input[type="text"],
input[type="number"],
textarea,
select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #007aff;
}

label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
}
</style>
