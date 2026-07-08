import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Login from '@/pages/Login.vue'
import Students from '@/pages/Students.vue'
import Grades from '@/pages/Grades.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
    { path: '/students', name: 'students', component: Students, meta: { requiresAuth: true, adminOnly: true } },
    { path: '/grades', name: 'grades', component: Grades, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/grades' },
  ],
})

// 全局路由守卫：登录校验与管理员权限控制。
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.user) {
    return { path: '/login' }
  }
  if (to.meta.adminOnly && auth.user?.role !== 'admin') {
    return { path: '/grades' }
  }
  if (to.meta.guestOnly && auth.user) {
    return { path: '/grades' }
  }
  return true
})

export default router
