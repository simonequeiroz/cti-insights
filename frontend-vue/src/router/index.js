import { createRouter, createWebHistory } from 'vue-router'

import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import UploadView from '../views/UploadView.vue'
import Dashboard from '../views/Dashboard.vue'
import Relatorios from '../views/Relatorios.vue'
import { estaAutenticado } from '../services/api'

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

// A sessão vive em services/api.js (hoje simulada; troque lá quando a API
// de autenticação existir).
router.beforeEach(to => {
  const autenticado = estaAutenticado()

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