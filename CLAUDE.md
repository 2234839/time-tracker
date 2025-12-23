# 数据迁移规则

每次修改存储结构时：

1. 在 `src/utils/storage.ts` 递增 `CURRENT_SCHEMA_VERSION`
2. 更新版本历史注释
3. 添加迁移函数处理旧数据
4. 在 `init()` 中自动执行迁移

```typescript
// 示例：添加新字段
function migrateProject(data: any): Project {
  if (data.parentId === undefined) {
    return { ...data, parentId: null }
  }
  return data
}
```

# Neutralino
当前项目是基于 Neutralino.js 运行的，但是不要直接使用 Neutralino 全局变量 api，请使用 import { xxx } from '@neutralinojs/lib' 这种写法