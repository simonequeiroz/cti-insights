import { createRouter, createWebHistory } from 'vue-router'

import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import UploadView from '../views/UploadView.vue'
import Dashboard from '../views/Dashboard.vue'
import Relatorios from '../views/Relatorios.vue'
import { useAuthStore } from '../stores/authStore'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/upload',
    name: 'Upload',
    component: UploadView,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/relatorios',
    name: 'Relatorios',
    component: Relatorios,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// A sessão é lida do authStore (que por sua vez usa services/api.js; troque
// lá quando a API de autenticação existir). O store pode ser usado aqui
// porque o Pinia é instalado no main.js antes da primeira navegação.
router.beforeEach(to => {
  const autenticado = useAuthStore().autenticado

  // Rota protegida sem sessão: manda para o login e guarda para onde
  // o usuário queria ir, para redirecionar de volta depois de entrar.
  if (to.meta.requiresAuth && !autenticado) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // Já autenticado tentando abrir a tela de login: não faz sentido,
  // manda direto para o dashboard.
  if (to.path === '/login' && autenticado) {
    return '/dashboard'
  }

  return true
})

export default router