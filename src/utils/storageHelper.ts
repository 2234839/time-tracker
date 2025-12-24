import { ref, watch, onMounted } from 'vue'
import { storage } from '@neutralinojs/lib'

/**
 * Neutralino 存储适配的响应式存储 hook
 * 类似 @vueuse/core 的 useStorage，但使用 Neutralino 存储 API
 */
export function useStorage<T>(key: string, defaultValue: T) {
  const value = ref<T>(defaultValue)

  // 从 Neutralino 存储加载值
  onMounted(async () => {
    try {
      const saved = await storage.getData(key)
      if (saved) {
        value.value = JSON.parse(saved)
      }
    } catch {
      // 没有保存的值，使用默认值
    }
  })

  // 监听值变化，自动保存
  watch(value, (newValue) => {
    storage.setData(key, JSON.stringify(newValue))
  }, { deep: true })

  return value
}
