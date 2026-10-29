import { createRouter, createWebHistory } from 'vue-router'

import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Cadastro from '../views/Cadastro.vue'
import UploadView from '../views/UploadView.vue'
import Dashboard from '../views/Dashboard.vue'
import Relatorios from '../views/Relatorios.vue'
import Usuarios from '../views/Usuarios.vue'
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
    meta: { somenteVisitante: true },
  },
  {
    path: '/cadastro',
    name: 'Cadastro',
    component: Cadastro,
    meta: { somenteVisitante: true },
  },
  {
    path: '/upload',
    name: 'Upload',
    component: UploadView,
    meta: { requiresAuth: true, permissao: 'importarPlanilha' },
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
  {
    path: '/usuarios',
    name: 'Usuarios',
    component: Usuarios,
    meta: { requiresAuth: true, permissao: 'gerenciarUsuarios' },
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
  const auth = useAuthStore()
  const autenticado = auth.autenticado

  // Rota protegida sem sessão: manda para o login e guarda para onde
  // o usuário queria ir, para redirecionar de volta depois de entrar.
  if (to.meta.requiresAuth && !autenticado) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // Já autenticado tentando abrir o login ou o cadastro: não faz sentido,
  // manda direto para o dashboard.
  if (to.meta.somenteVisitante && autenticado) {
    return '/dashboard'
  }

  // Tela que o papel do usuário não pode usar (ex.: Analista abrindo
  // /upload pelo endereço): volta ao Dashboard, que mostra um aviso.
  // Regras em utils/papeis.js.
  if (to.meta.permissao && !auth.pode(to.meta.permissao)) {
    return { path: '/dashboard', query: { semPermissao: to.path } }
  }

  return true
})

export default router