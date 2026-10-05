import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'
import { getAuthorization } from '@/utils/auth-token'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/inbox/:accountId',
    name: 'Inbox',
    component: () => import('@/views/inbox/index.vue'),
    meta: { title: '收件箱' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '账号登录' }
  },
  {
    path: '/',
    component: Layout,
    meta: { requiresAuth: true },
    redirect: '/reports',
    children: [
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/index.vue'),
        meta: { title: 'Reports' }
      },
      {
        path: 'mail',
        name: 'Mail',
        component: () => import('@/views/mail/index.vue')
      },
      {
        path: 'ai-register',
        name: 'AiRegister',
        component: () => import('@/views/ai-register/index.vue')
      },
      {
        path: 'account-management',
        name: 'AccountManagement',
        component: () => import('@/views/account-management/index.vue'),
        meta: { title: '账号管理' }
      },
      {
        path: 'invite-code',
        name: 'InviteCode',
        component: () => import('@/views/invite-code/index.vue')
      },
      {
        path: 'register-logs',
        name: 'RegisterLogs',
        component: () => import('@/views/register-logs/index.vue')
      },
      {
        path: 'operation-audit',
        name: 'OperationAudit',
        component: () => import('@/views/operation-audit/index.vue')
      },
      {
        path: 'permissions',
        name: 'Permissions',
        component: () => import('@/views/permissions/index.vue')
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue')
      },
      {
        path: 'library',
        name: 'Library',
        component: () => import('@/views/library/index.vue'),
        meta: { title: 'Library' }
      },
      {
        path: 'people',
        name: 'People',
        component: () => import('@/views/people/index.vue'),
        meta: { title: 'People' }
      },
      {
        path: 'activities',
        name: 'Activities',
        component: () => import('@/views/activities/index.vue'),
        meta: { title: 'Activities' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/reports' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

/** 登录后仅返回工作台或收件箱，避免跳转到外站或再次进入登录页。 */
export function loginDestination(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/reports'
  const target = router.resolve(value)
  return target.name === 'Inbox' || target.matched.some(route => route.meta.requiresAuth) ? value : '/reports'
}

router.beforeEach((to, from, next) => {
  const loggedIn = !!getAuthorization()
  if (to.meta.requiresAuth && !loggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && loggedIn) {
    next(loginDestination(to.query.redirect))
  } else {
    next()
  }
})

export default router
