# 工时记录应用

一个基于 Vue3 + TypeScript + Neutralino 的本地工时记录桌面应用。

## 功能特点

- **项目管理**：创建、编辑、删除项目
- **实时计时**：对任意项目开始/停止计时
- **时间记录**：每条记录独立保存，支持编辑时间、备注
- **费用计算**：每条记录有自己的每小时费率，自动计算费用
- **费率管理**：项目费率可调整，新费率只影响之后创建的记录
- **批量编辑**：可批量修改多条记录的费率或备注
- **数据统计**：实时显示项目总时长、总费用、记录数
- **本地存储**：使用 Neutralino 本地存储 API，数据保存在本地

## 开发

### 安装依赖
```bash
pnpm install
```

### 开发模式（浏览器）
```bash
pnpm dev
```
访问 http://localhost:5173/

注意：浏览器模式下 Neutralino API 不可用，需要构建后在 Neutralino 环境中运行。

### 构建
```bash
pnpm build
```

### 运行 Neutralino 应用
```bash
pnpm neu:run
```

### 构建发布版本
```bash
pnpm neu:build
```

## 项目结构

```
time-tracker/
├── src/
│   ├── components/      # Vue 组件
│   ├── stores/          # 状态管理
│   ├── types/           # TypeScript 类型定义
│   ├── utils/           # 工具函数（数据存储）
│   ├── App.vue          # 主应用组件
│   └── main.ts          # 入口文件
├── resources/           # Neutralino 资源
│   ├── dist/            # 构建输出
│   └── js/              # Neutralino 客户端库
├── neutralino.config.json # Neutralino 配置
└── package.json
```

## 使用说明

1. **新建项目**：点击"新建项目"按钮，输入项目名称和每小时费用
2. **开始计时**：点击项目列表中的"开始"按钮
3. **停止计时**：点击"停止"按钮，记录自动保存
4. **编辑记录**：在记录列表中点击"编辑"修改时间、费率或备注
5. **删除记录**：点击"删除"按钮删除单条记录
6. **批量编辑**：勾选多条记录，点击"批量编辑"按钮
7. **修改项目费率**：点击项目"编辑"按钮修改费率（仅影响新记录）

## 技术栈

- **前端框架**：Vue 3
- **构建工具**：Vite
- **类型系统**：TypeScript
- **桌面框架**：Neutralino
- **包管理器**：pnpm
