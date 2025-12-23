import { reactive } from 'vue'
import type { Project, TimeRecord, TimerState, ProjectStats } from '../types'
import { createStorage } from '../utils/storage'
import * as Neutralino from '@neutralinojs/lib'

const storage = createStorage(Neutralino.storage)

export type ProjectSortType = 'manual' | 'recent' | 'name'

export const store = reactive({
  projects: [] as Project[],
  records: [] as TimeRecord[],
  timer: { activeTimers: {} } as TimerState,
  initialized: false,

  async init() {
    if (this.initialized) return
    await storage.init()
    this.projects = storage.getProjects()
    this.records = storage.getRecords()
    this.timer = storage.getTimer()
    this.initialized = true
  },

  getProject(id: string) {
    return this.projects.find(p => p.id === id)
  },

  getChildren(parentId: string | null): Project[] {
    return storage.getChildren(parentId)
  },

  getAllDescendants(projectId: string): Project[] {
    return storage.getAllDescendants(projectId)
  },

  getAncestors(projectId: string): Project[] {
    return storage.getAncestors(projectId)
  },

  // 获取排序后的顶级项目
  getSortedProjects(sortType: ProjectSortType = 'manual'): Project[] {
    const topLevel = this.projects.filter(p => p.parentId === null)

    switch (sortType) {
      case 'manual':
        return topLevel.sort((a, b) => a.sortOrder - b.sortOrder)
      case 'recent':
        return topLevel.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      case 'name':
        return topLevel.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      default:
        return topLevel
    }
  },

  getRecords(projectId: string) {
    return this.records.filter(r => r.projectId === projectId)
      .sort((a, b) => b.startTime - a.startTime)
  },

  getProjectStats(projectId: string): ProjectStats {
    const records = this.getRecords(projectId)
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
  },

  // 获取项目及其所有子项目的聚合统计
  getProjectStatsWithChildren(projectId: string): ProjectStats {
    const allRecords = storage.getProjectRecordsWithChildren(projectId)
    const totalDuration = allRecords.reduce((sum, r) => {
      if (r.endTime === null) return sum
      return sum + (r.endTime - r.startTime)
    }, 0)

    const totalCost = allRecords.reduce((sum, r) => {
      if (r.endTime === null) return sum
      const duration = r.endTime - r.startTime
      const hours = duration / (1000 * 60 * 60)
      return sum + (hours * r.hourlyRate)
    }, 0)

    return {
      totalDuration,
      totalCost,
      recordCount: allRecords.length,
    }
  },

  getActiveRecord(projectId: string): TimeRecord | null {
    return this.records.find(r =>
      r.projectId === projectId &&
      r.endTime === null
    ) || null
  },

  isTimerRunning(projectId: string): boolean {
    return projectId in this.timer.activeTimers
  },

  getTimerDuration(projectId: string): number {
    const startTime = this.timer.activeTimers[projectId]
    if (!startTime) return 0
    return Date.now() - startTime
  },

  async addProject(name: string, hourlyRate: number, parentId: string | null = null) {
    const project = await storage.addProject({ name, hourlyRate, parentId, sortOrder: 0 })
    this.projects.push(project)
    return project
  },

  async updateProject(id: string, updates: { name?: string; hourlyRate?: number; parentId?: string | null }) {
    await storage.updateProject(id, updates)
    const index = this.projects.findIndex(p => p.id === id)
    if (index !== -1) {
      this.projects[index] = { ...this.projects[index], ...updates }
    }
  },

  async deleteProject(id: string) {
    await storage.deleteProject(id)
    // 获取所有后代 ID
    const descendants = storage.getAllDescendants(id)
    const allIds = [id, ...descendants.map(p => p.id)]
    this.projects = this.projects.filter(p => !allIds.includes(p.id))
    this.records = this.records.filter(r => !allIds.includes(r.projectId))
  },

  async startTimer(projectId: string) {
    // 如果该项目已经在计时，不重复启动
    if (this.isTimerRunning(projectId)) {
      return
    }

    // 更新项目使用时间
    await storage.updateProjectLastUsed(projectId)
    const project = this.getProject(projectId)
    if (project) {
      project.lastUsedAt = Date.now()
    }

    if (!project) return

    const record = await storage.addRecord({
      projectId,
      startTime: Date.now(),
      endTime: null,
      hourlyRate: project.hourlyRate,
      note: '',
    })
    this.records.push(record)

    await storage.setTimer(projectId, record.startTime)
    this.timer.activeTimers[projectId] = record.startTime
  },

  async updateProjectOrder(projectIds: string[]) {
    await storage.updateProjectOrder(projectIds)
    // 更新本地 sortOrder
    for (let i = 0; i < projectIds.length; i++) {
      const project = this.getProject(projectIds[i])
      if (project) {
        project.sortOrder = i
      }
    }
  },

  async updateProjectLastUsed(projectId: string) {
    await storage.updateProjectLastUsed(projectId)
    const project = this.getProject(projectId)
    if (project) {
      project.lastUsedAt = Date.now()
    }
  },

  async stopTimer(projectId: string) {
    if (!this.isTimerRunning(projectId)) return

    const endTime = Date.now()
    const activeRecord = this.getActiveRecord(projectId)
    if (activeRecord) {
      await storage.updateRecord(activeRecord.id, { endTime })
      const index = this.records.findIndex(r => r.id === activeRecord.id)
      if (index !== -1) {
        this.records[index].endTime = endTime
      }
    }

    await storage.clearTimer(projectId)
    delete this.timer.activeTimers[projectId]
  },

  async updateRecord(id: string, updates: Partial<Omit<TimeRecord, 'id' | 'projectId' | 'startTime'>>) {
    await storage.updateRecord(id, updates)
    const index = this.records.findIndex(r => r.id === id)
    if (index !== -1) {
      this.records[index] = { ...this.records[index], ...updates }
    }
  },

  async deleteRecord(id: string) {
    await storage.deleteRecord(id)
    this.records = this.records.filter(r => r.id !== id)
  },

  async batchUpdateRecords(ids: string[], updates: Partial<Omit<TimeRecord, 'id' | 'projectId' | 'startTime'>>) {
    await storage.batchUpdateRecords(ids, updates)
    for (const id of ids) {
      const index = this.records.findIndex(r => r.id === id)
      if (index !== -1) {
        this.records[index] = { ...this.records[index], ...updates }
      }
    }
  },
})
