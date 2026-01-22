# 数据存储 storage

所有需要持久化的数据都应该使用 src/utils/storage.ts 实现，请确保所有存储都使用了统一方案，都支持旧数据版本升级迁移

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

# 项目管理

发版时需要更新 package vsrsion 和添加 git tag 以及更新 CHANGELOG.md

- 除了发版时，我没有让你commit时请不要自行commit，可以询问我是否需要