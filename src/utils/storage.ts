import type { Project, TimeRecord, TimerState } from '../types'

// 版本历史
// v1: 初始版本，Project 没有 parentId 字段
// v2: 添加 parentId 字段支持子项目，TimerState 改为 activeTimers 结构
// v3: 添加 sortOrder 和 lastUsedAt 字段支持排序

// 数据迁移函数
interface LegacyTimerStateV1 {
  projectId: string | null
  startTime: number | null
}

function migrateProject(project: any): Project {
  let p = project

  // v1 -> v2: 添加 parentId 字段
  if (p.parentId === undefined) {
    p = { ...p, parentId: null }
  }

  // v2 -> v3: 添加 sortOrder 和 lastUsedAt 字段
  if (p.sortOrder === undefined) {
    p = { ...p, sortOrder: 0 }
  }
  if (p.lastUsedAt === undefined) {
    p = { ...p, lastUsedAt: p.createdAt || Date.now() }
  }

  return p
}

function migrateTimerState(timerData: any): TimerState {
  // 检查是否是旧版本格式
  if (timerData.projectId !== undefined || timerData.startTime !== undefined) {
    const oldTimer = timerData as LegacyTimerStateV1
    if (oldTimer.projectId && oldTimer.startTime) {
      return {
        activeTimers: {
          [oldTimer.projectId]: oldTimer.startTime
        }
      }
    }
    return { activeTimers: {} }
  }
  return timerData
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// Storage 适配器接口
interface StorageAdapter {
  getData(key: string): Promise<string>
  setData(key: string, value: string): Promise<void>
}

class Storage {
  private projects: Project[] = []
  private records: TimeRecord[] = []
  private timer: TimerState = { activeTimers: {} }
  private initialized = false

  constructor(private storage: StorageAdapter) {}

  async init() {
    if (this.initialized) return

    try {
      const projectsData = await this.storage.getData('projects')
      const rawProjects = JSON.parse(projectsData)
      this.projects = rawProjects.map(migrateProject)
    } catch {
      this.projects = []
    }

    try {
      const recordsData = await this.storage.getData('records')
      this.records = JSON.parse(recordsData)
    } catch {
      this.records = []
    }

    try {
      const timerData = await this.storage.getData('timer')
      this.timer = migrateTimerState(JSON.parse(timerData))
    } catch {
      this.timer = { activeTimers: {} }
    }

    await this.saveAll()
    this.initialized = true
  }

  private async saveAll() {
    await this.storage.setData('projects', JSON.stringify(this.projects))
    await this.storage.setData('records', JSON.stringify(this.records))
    await this.storage.setData('timer', JSON.stringify(this.timer))
  }

  private async saveProjects() {
    await this.storage.setData('projects', JSON.stringify(this.projects))
  }

  private async saveRecords() {
    await this.storage.setData('records', JSON.stringify(this.records))
  }

  private async saveTimer() {
    await this.storage.setData('timer', JSON.stringify(this.timer))
  }

  getProjects(): Project[] {
    return [...this.projects]
  }

  getProject(id: string): Project | undefined {
    return this.projects.find(p => p.id === id)
  }

  getChildren(parentId: string | null): Project[] {
    if (parentId === null) {
      return this.projects.filter(p => p.parentId === null)
    }
    return this.projects.filter(p => p.parentId === parentId)
  }

  getAllDescendants(projectId: string): Project[] {
    const children = this.getChildren(projectId)
    const descendants: Project[] = [...children]
    for (const child of children) {
      descendants.push(...this.getAllDescendants(child.id))
    }
    return descendants
  }

  getAncestors(projectId: string): Project[] {
    const project = this.getProject(projectId)
    if (!project || !project.parentId) return []
    const parent = this.getProject(project.parentId)
    if (!parent) return []
    return [parent, ...this.getAncestors(parent.id)]
  }

  async addProject(project: Omit<Project, 'id' | 'createdAt' | 'lastUsedAt'>): Promise<Project> {
    const now = Date.now()
    const newProject: Project = {
      id: generateId(),
      ...project,
      createdAt: now,
      lastUsedAt: now,
      sortOrder: project.sortOrder ?? 0,
    }
    this.projects.push(newProject)
    await this.saveProjects()
    return newProject
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    const index = this.projects.findIndex(p => p.id === id)
    if (index !== -1) {
      this.projects[index] = { ...this.projects[index], ...updates }
      await this.saveProjects()
    }
  }

  async deleteProject(id: string): Promise<void> {
    const descendants = this.getAllDescendants(id)
    const allIdsToDelete = [id, ...descendants.map(p => p.id)]
    this.projects = this.projects.filter(p => !allIdsToDelete.includes(p.id))
    this.records = this.records.filter(r => !allIdsToDelete.includes(r.projectId))
    await this.saveProjects()
    await this.saveRecords()
  }

  async updateProjectOrder(projectIds: string[]): Promise<void> {
    for (let i = 0; i < projectIds.length; i++) {
      const project = this.projects.find(p => p.id === projectIds[i])
      if (project && project.sortOrder !== i) {
        project.sortOrder = i
      }
    }
    await this.saveProjects()
  }

  async updateProjectLastUsed(projectId: string): Promise<void> {
    const project = this.getProject(projectId)
    if (project) {
      project.lastUsedAt = Date.now()
      await this.saveProjects()
    }
  }

  getRecords(projectId?: string): TimeRecord[] {
    if (projectId) {
      return this.records.filter(r => r.projectId === projectId)
    }
    return [...this.records]
  }

  async addRecord(record: Omit<TimeRecord, 'id'>): Promise<TimeRecord> {
    const newRecord: TimeRecord = {
      id: generateId(),
      ...record,
    }
    this.records.push(newRecord)
    await this.saveRecords()
    return newRecord
  }

  async updateRecord(id: string, updates: Partial<Omit<TimeRecord, 'id'>>): Promise<void> {
    const index = this.records.findIndex(r => r.id === id)
    if (index !== -1) {
      this.records[index] = { ...this.records[index], ...updates }
      await this.saveRecords()
    }
  }

  async deleteRecord(id: string): Promise<void> {
    this.records = this.records.filter(r => r.id !== id)
    await this.saveRecords()
  }

  async batchUpdateRecords(ids: string[], updates: Partial<Omit<TimeRecord, 'id'>>): Promise<void> {
    for (const id of ids) {
      const index = this.records.findIndex(r => r.id === id)
      if (index !== -1) {
        this.records[index] = { ...this.records[index], ...updates }
      }
    }
    await this.saveRecords()
  }

  getTimer(): TimerState {
    return { activeTimers: { ...this.timer.activeTimers } }
  }

  getActiveTimer(projectId: string): number | null {
    return this.timer.activeTimers[projectId] || null
  }

  isTimerRunning(projectId: string): boolean {
    return projectId in this.timer.activeTimers
  }

  async setTimer(projectId: string, startTime: number): Promise<void> {
    this.timer.activeTimers[projectId] = startTime
    await this.saveTimer()
  }

  async clearTimer(projectId: string): Promise<void> {
    delete this.timer.activeTimers[projectId]
    await this.saveTimer()
  }

  getProjectRecordsWithChildren(projectId: string): TimeRecord[] {
    const descendantIds = [projectId, ...this.getAllDescendants(projectId).map(p => p.id)]
    return this.records.filter(r => descendantIds.includes(r.projectId))
  }
}

// 导出工厂函数
export function createStorage(adapter: StorageAdapter) {
  return new Storage(adapter)
}
