import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './index.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 先恢复会话，再挂载应用，确保路由守卫能拿到正确的登录态。
const auth = useAuthStore()
auth.restore().finally(() => {
  app.mount('#app')
})
