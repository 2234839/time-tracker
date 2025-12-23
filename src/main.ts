import { createApp } from 'vue'
import App from './App.vue'
import { init } from '@neutralinojs/lib'

// 先初始化 Neutralino，再挂载 Vue 应用
async function bootstrap() {
  try {
    await init()
  } catch (error) {
    console.warn('Neutralino init failed or running in browser mode:', error)
  }
  createApp(App).mount('#app')
}

bootstrap()
