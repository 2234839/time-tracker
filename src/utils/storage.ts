import type { Project, TimeRecord, TimerState } from '../types'
import { ref, watch, onMounted } from 'vue'
import { storage as nlStorage } from '@neutralinojs/lib'

// ============ 存储版本管理 ============
/**
 * 存储数据结构（版本化）
 * 数据存储格式: { v: number, d: T }
 * v: 版本号
 * d: 实际数据
 */

/**
 * 存储键版本号定义
 * 修改数据结构时递增对应键的版本号
 */
export const STORAGE_VERSIONS = {
  // 核心业务数据（使用 Storage class）
  projects: 3,
  records: 1,
  timer: 2,

  // UI 状态数据（使用 useStorage hook）
  'project-expanded': 1,
  'sidebar-width': 1,
} as const

/**
 * 版本历史说明：
 *
 * projects (v3):
 *   - v1: 初始版本，Project 没有 parentId 字段
 *   - v2: 添加 parentId 字段支持子项目
 *   - v3: 添加 sortOrder 和 lastUsedAt 字段支持排序
 *
 * timer (v2):
 *   - v1: 单个计时器，使用 { projectId, startTime } 结构
 *   - v2: 多计时器支持，使用 { activeTimers: Record<string, number> } 结构
 *
 * records (v1): 初始版本
 * project-expanded (v1): 初始版本
 * sidebar-width (v1): 初始版本
 */

// ============ 类型定义 ============
type Serializer<T> = {
  read: (value: string) => T
  write: (value: T) => string
}

type MergeDefaultsFn<T> = (storageValue: any, defaults: T) => T

interface UseStorageOptions<T> {
  defaultValue: T
  version?: number
  mergeDefaults?: boolean | MergeDefaultsFn<T>
}

// ============ 版本化序列化器 ============
/**
 * 创建版本化序列化器，将版本号和数据打包在一起
 */
function createVersionedSerializer<T>(version: number): Serializer<T> {
  return {
    read: (v: string) => {
      try {
        const parsed = JSON.parse(v)
        // 兼容旧格式（直接存储数据，没有版本号）
        if (typeof parsed === 'object' && parsed !== null && 'v' in parsed && 'd' in parsed) {
          return parsed.d
        }
        // 旧格式数据，直接返回
        return parsed
      } catch {
        return v as any
      }
    },
    write: (value: T) => {
      return JSON.stringify({ v: version, d: value })
    },
  }
}

/**
 * 读取存储的版本号（用于迁移判断）
 */
function readStoredVersion(value: string): number {
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'object' && parsed !== null && 'v' in parsed) {
      return parsed.v
    }
    // 旧格式数据，默认版本为 1
    return 1
  } catch {
    return 1
  }
}

// ============ 低级存储操作 ============
async function getData(key: string): Promise<string> {
  return await nlStorage.getData(key)
}

async function setData(key: string, value: string): Promise<void> {
  await nlStorage.setData(key, value)
}

// ============ 版本迁移的 useStorage（组件内使用） ============
/**
 * 支持版本迁移的响应式存储 hook（仅在组件内使用）
 *
 * 数据格式: { v: version, d: data }
 *
 * @example
 * // 使用默认版本号（从 STORAGE_VERSIONS 获取）
 * const state = useStorage('my-key', { defaultValue: {} })
 *
 * // 自定义版本号
 * const state = useStorage('my-key', { defaultValue: {}, version: 2 })
 */
export function useStorage<T>(key: string, options: UseStorageOptions<T>) {
  // 如果未指定版本，从 STORAGE_VERSIONS 获取默认版本，默认为 1
  const defaultVersion = (STORAGE_VERSIONS as Record<string, number>)[key] ?? 1
  const {
    defaultValue,
    version = defaultVersion,
    mergeDefaults = false,
  } = options

  const value = ref<T>(defaultValue)
  const serializer = createVersionedSerializer<T>(version)

  function defaultMerge(storedValue: any, defaults: T): T {
    if (typeof defaults === 'object' && defaults !== null && !Array.isArray(defaults)) {
      return { ...defaults, ...storedValue }
    }
    return storedValue ?? defaults
  }

  // 加载数据
  async function load() {
    try {
      const savedValue = await getData(key)

      if (savedValue) {
        const savedVersion = readStoredVersion(savedValue)
        let parsedValue = serializer.read(savedValue)

        // 版本迁移
        if (savedVersion < version || mergeDefaults) {
          if (typeof mergeDefaults === 'function') {
            parsedValue = mergeDefaults(parsedValue, defaultValue)
          } else if (mergeDefaults === true) {
            parsedValue = defaultMerge(parsedValue, defaultValue)
          }
          // 保存迁移后的数据（带新版本号）
          await setData(key, serializer.write(parsedValue))
        }

        value.value = parsedValue
      }
    } catch {
      value.value = defaultValue
    }
  }

  onMounted(load)

  watch(value, (newValue) => {
    setData(key, serializer.write(newValue))
  }, { deep: true })

  return value
}

// ============ 数据迁移函数 ============
interface LegacyTimerStateV1 {
  projectId: string | null
  startTime: number | null
}

function mergeProjects(stored: any, defaults: Project[]): Project[] {
  let projects = stored || defaults

  // v1 -> v2: 添加 parentId 字段
  if (projects && !projects.every((p: any) => 'parentId' in p)) {
    projects = projects.map((p: any) => ({
      ...p,
      parentId: p.parentId ?? null
    }))
  }

  // v2 -> v3: 添加 sortOrder 和 lastUsedAt 字段
  if (projects && !projects.every((p: any) => 'sortOrder' in p && 'lastUsedAt' in p)) {
    projects = projects.map((p: any) => ({
      ...p,
      sortOrder: p.sortOrder ?? 0,
      lastUsedAt: p.lastUsedAt ?? p.createdAt ?? Date.now()
    }))
  }

  return projects
}

function mergeTimerState(stored: any, defaults: TimerState): TimerState {
  // v1 -> v2: 从单计时器迁移到多计时器
  if (stored.projectId !== undefined || stored.startTime !== undefined) {
    const oldTimer = stored as LegacyTimerStateV1
    if (oldTimer.projectId && oldTimer.startTime) {
      return {
        activeTimers: {
          [oldTimer.projectId]: oldTimer.startTime
        }
      }
    }
    return { activeTimers: {} }
  }

  return stored ?? defaults
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// ============ Class 方式的存储（非组件环境使用） ============

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

  /**
   * 读取版本化数据
   */
  private async getVersionedData<T>(key: string, version: number, defaultValue: T): Promise<T> {
    try {
      const raw = await this.storage.getData(key)
      if (!raw) return defaultValue

      const savedVersion = readStoredVersion(raw)
      let data = JSON.parse(raw).d ?? JSON.parse(raw) // 兼容旧格式

      // 如果版本不匹配，执行迁移
      if (savedVersion < version) {
        data = this.migrateData(key, savedVersion, version, data)
        await this.saveVersionedData(key, version, data)
      }

      return data
    } catch {
      return defaultValue
    }
  }

  /**
   * 保存版本化数据
   */
  private async saveVersionedData<T>(key: string, version: number, data: T): Promise<void> {
    const versioned = { v: version, d: data }
    await this.storage.setData(key, JSON.stringify(versioned))
  }

  /**
   * 数据迁移
   */
  private migrateData(key: string, _fromVersion: number, _toVersion: number, data: any): any {
    switch (key) {
      case 'projects':
        return mergeProjects(data, [])
      case 'timer':
        return mergeTimerState(data, { activeTimers: {} })
      default:
        return data
    }
  }

  async init() {
    if (this.initialized) return

    // 加载并迁移 projects
    this.projects = await this.getVersionedData('projects', STORAGE_VERSIONS.projects, [])

    // 加载 records
    this.records = await this.getVersionedData('records', STORAGE_VERSIONS.records, [])

    // 加载并迁移 timer
    this.timer = await this.getVersionedData('timer', STORAGE_VERSIONS.timer, { activeTimers: {} })

    this.initialized = true
  }

  private async saveProjects() {
    await this.saveVersionedData('projects', STORAGE_VERSIONS.projects, this.projects)
  }

  private async saveRecords() {
    await this.saveVersionedData('records', STORAGE_VERSIONS.records, this.records)
  }

  private async saveTimer() {
    await this.saveVersionedData('timer', STORAGE_VERSIONS.timer, this.timer)
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

export function createStorage(adapter: StorageAdapter) {
  return new Storage(adapter)
}
