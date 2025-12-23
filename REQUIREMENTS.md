# 工时记录应用 - 需求文档

## 项目概述

一个基于 Vue3 + TypeScript + Neutralino 的本地工时记录桌面应用，用于追踪多个项目的工时和费用。

## 核心功能需求

### 1. 项目管理
- 创建、编辑、删除项目
- 每个项目可配置独立的每小时费用
- 费率可随时调整（新费率仅影响之后创建的记录）

### 2. 多项目同时计时（核心需求）

#### 2.1 当前实现限制
- **当前**：一次只能对一个项目进行计时
- **问题**：TimerState 是全局单例，只存储一个 projectId 和 startTime

#### 2.2 需要实现的功能
- **同时计时**：可以同时对多个项目开始计时
- **独立控制**：每个项目的计时状态独立，互不影响
- **状态显示**：在项目列表中实时显示每个项目的计时状态和已计时长

#### 2.3 数据结构变更

**当前实现：**
```typescript
interface TimerState {
  projectId: string | null
  startTime: number | null
}
```

**需要改为：**
```typescript
// 方案一：Map 结构
interface TimerState {
  [projectId: string]: number  // projectId -> startTime
}

// 方案二：数组结构
interface ActiveTimer {
  projectId: string
  startTime: number
}

interface TimerState {
  timers: ActiveTimer[]
}
```

#### 2.4 UI 变更

**项目列表组件需要：**
- 每个项目独立显示计时按钮（开始/停止）
- 同时运行的项目各自显示计时器
- 计时器实时更新（HH:MM:SS 格式）
- 支持多个项目同时处于"计时中"状态

```
示例 UI：
┌─────────────────────────────────┐
│ 项目 A                    [停止] │
│ ¥100/小时                      │
│ ⏱ 01:23:45                    │
├─────────────────────────────────┤
│ 项目 B                    [停止] │
│ ¥80/小时                       │
│ ⏱ 00:45:32                    │
├─────────────────────────────────┤
│ 项目 C                   [开始] │
│ ¥120/小时                      │
│ （未计时）                      │
└─────────────────────────────────┘
```

### 3. 时间记录管理
- 每次开始/停止计时生成一条时间记录
- 记录包含：项目ID、开始时间、结束时间、该记录的费率、备注
- 支持编辑时间、修改备注、删除记录
- 结束时间为 null 表示计时中

### 4. 费用计算规则
- **每条记录独立费率**：记录创建时的项目费率被锁定在该记录上
- **项目费率变更**：不影响历史记录，仅影响新创建的记录
- **实时计算**：根据记录时长和费率自动计算费用

```
示例：
- 项目A初始费率 ¥100/小时
- 创建记录1：2小时，费用 ¥200
- 修改项目A费率为 ¥120/小时
- 创建记录2：3小时，费用 ¥360
- 记录1的费用仍然是 ¥200（不受费率变更影响）
```

### 5. 批量编辑
- 支持勾选多条记录进行批量操作
- 可批量修改：每小时费率、备注
- 用于历史记录的费率调整或统一添加备注

### 6. 数据统计
- 每个项目的统计数据：
  - 总时长（小时 + 分钟）
  - 总费用
  - 记录数量
- 仅统计已完成的记录（endTime 不为 null）

### 7. 数据存储
- 使用 Neutralino Storage API 本地存储
- 数据结构：
  - `projects`: 项目列表
  - `records`: 时间记录列表
  - `timers`: 活跃的计时器状态（支持多个）

## 技术实现要点

### 需要修改的文件

#### 1. 类型定义 ([`src/types/index.ts`](src/types/index.ts))
```typescript
// 当前
interface TimerState {
  projectId: string | null
  startTime: number | null
}

// 修改为
interface TimerState {
  [projectId: string]: number  // projectId -> startTime
}
```

#### 2. 数据存储层 ([`src/utils/storage.ts`](src/utils/storage.ts))
```typescript
// 修改 getTimer / setTimer 方法
// 保存/读取多个计时器状态

getTimer(): TimerState {
  return this.timer || {}
}

async setTimer(timer: TimerState): Promise<void> {
  this.timer = { ...timer }
  await this.saveTimer()
}

async startProjectTimer(projectId: string): Promise<void> {
  if (!this.timer) {
    this.timer = {}
  }
  this.timer[projectId] = Date.now()
  await this.saveTimer()
}

async stopProjectTimer(projectId: string): Promise<void> {
  if (this.timer && this.timer[projectId]) {
    delete this.timer[projectId]
    await this.saveTimer()
  }
}
```

#### 3. 状态管理 ([`src/stores/store.ts`](src/stores/store.ts))
```typescript
// 修改计时相关方法

isTimerRunning(projectId: string): boolean {
  return this.timer?.[projectId] !== undefined
}

getTimerDuration(projectId: string): number {
  const startTime = this.timer?.[projectId]
  if (!startTime) return 0
  return Date.now() - startTime
}

async startTimer(projectId: string) {
  // 不再需要停止其他计时器
  // 直接开始新项目的计时
}

async stopTimer(projectId: string) {
  // 只停止指定项目的计时
}

getRunningTimers(): string[] {
  return Object.keys(this.timer || {})
}
```

#### 4. UI 组件

**[ProjectList.vue](src/components/ProjectList.vue)**
- 移除 `activeProjectId` 的概念
- 每个项目独立显示计时状态
- 支持多个项目同时显示计时器

**[App.vue](src/App.vue)**
- 更新计时器状态监听
- 可能需要定期刷新多个项目的计时显示

## 界面设计要点

### 项目列表
- 紧凑显示：项目名称 + 费率
- 计时中的项目显示实时计时器
- 独立的开始/停止按钮

### 记录面板
- 保持当前设计
- 支持编辑、删除、批量操作

### 统计面板
- 总时长、总费用、记录数
- 实时更新（基于已完成的记录）

## 开发优先级

### Phase 1: 核心功能
1. 修改数据结构支持多计时器
2. 更新存储层
3. 更新状态管理
4. 修改项目列表 UI 支持多计时器显示

### Phase 2: 优化
1. 实时计时器更新（使用 requestAnimationFrame 或 setInterval）
2. 计时器精度优化
3. 错误处理（如重复点击开始）

### Phase 3: 增强功能
1. 计时器历史记录
2. 导出功能（CSV/Excel）
3. 图表统计

## 注意事项

1. **数据迁移**：修改 TimerState 结构后，需要考虑旧数据的兼容性
2. **性能**：多个计时器同时运行时，注意 UI 更新频率
3. **状态同步**：确保 UI 显示、内存状态、持久化存储三者一致
4. **用户体验**：多项目计时时的视觉区分，避免混淆
