export interface Project {
  id: string
  name: string
  hourlyRate: number
  createdAt: number
  parentId: string | null  // 父项目 ID，null 表示顶级项目
  sortOrder: number        // 手动排序顺序，默认 0
  lastUsedAt: number       // 最后使用时间，用于"最近使用"排序
}

export interface TimeRecord {
  id: string
  projectId: string
  startTime: number
  endTime: number | null
  hourlyRate: number
  note: string
}

export interface TimerState {
  // 存储每个正在计时的项目 ID 和其启动时间
  // 格式: { [projectId: string]: startTime }
  activeTimers: Record<string, number>
}

export interface ProjectStats {
  totalDuration: number
  totalCost: number
  recordCount: number
}
