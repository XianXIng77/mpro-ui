<template>
  <div class="shell-bg">
    <div class="shell-card">

      <!-- ================================
           左侧导航
           ================================ -->
      <aside
          class="sidebar"
          :class="{
          'sidebar-collapsed': sidebarCollapsed
        }"
      >

        <!-- ================================
             Logo
             ================================ -->
        <div class="logo-area">
          <SystemLogo v-if="!sidebarCollapsed" class="logo-svg" />
          <SystemLogo v-else compact class="mini-logo-svg" />
        </div>

        <!-- ================================
             导航区域
             ================================ -->
        <div class="sidebar-scroll">

          <div
              v-for="group in navGroups"
              :key="group.title"
              class="nav-group"
          >

            <!-- ================================
                 展开状态
                 ================================ -->
            <template v-if="!sidebarCollapsed">

              <div class="nav-group-title">
                {{ group.title }}
              </div>

              <a-menu
                  v-model:selectedKeys="selectedKeys"
                  mode="inline"
                  class="main-nav"
                  @click="handleMenuClick"
              >
                <a-menu-item
                    v-for="item in group.items"
                    :key="item.path"
                >
                  <template #icon>
                    <component :is="item.icon" />
                  </template>

                  <span>
                    {{ item.label }}
                  </span>
                </a-menu-item>
              </a-menu>

            </template>

            <!-- ================================
                 收缩状态
                 独立图标导航
                 ================================ -->
            <template v-else>

              <div class="nav-group-divider"></div>

              <div class="collapsed-nav">

                <a-tooltip
                    v-for="item in group.items"
                    :key="item.path"
                    placement="right"
                    :title="item.label"
                >
                  <a-button
                      type="text"
                      class="collapsed-nav-item"
                      :class="{
                      'collapsed-nav-item-active':
                        $route.path === item.path
                    }"
                      :aria-label="item.label"
                      @click="handleCollapsedMenuClick(item.path)"
                  >
                    <component
                        :is="item.icon"
                        class="collapsed-nav-icon"
                    />
                  </a-button>
                </a-tooltip>

              </div>

            </template>

          </div>

        </div>

      </aside>

      <!-- ================================
           右侧
           ================================ -->
      <section class="right-shell">

        <!-- ================================
             顶部 Header
             ================================ -->
        <header class="topbar">

          <!-- 左侧折叠按钮 -->
          <div class="topbar-left">

            <a-button
                type="text"
                class="sidebar-toggle"
                :aria-label="
                sidebarCollapsed
                  ? '展开导航栏'
                  : '收起导航栏'
              "
                @click="toggleSidebar"
            >
              <template #icon>

                <menu-unfold-outlined
                    v-if="sidebarCollapsed"
                />

                <menu-fold-outlined
                    v-else
                />

              </template>
            </a-button>

          </div>

          <!-- ================================
               搜索
               ================================ -->
          <div class="topbar-search">

            <a-input
                v-model:value="searchKeyword"
                allow-clear
                class="global-search"
                placeholder="搜索菜单、页面或功能"
                @pressEnter="handleGlobalSearch"
            >
              <template #prefix>
                <search-outlined />
              </template>
            </a-input>

          </div>

          <!-- ================================
               右侧
               ================================ -->
          <div class="topbar-actions">

            <!-- 通知 -->
            <a-button
                type="text"
                shape="circle"
                class="topbar-icon-btn"
                aria-label="通知"
            >
              <template #icon>
                <bell-outlined />
              </template>
            </a-button>

            <a-divider
                type="vertical"
                class="topbar-divider"
            />

            <!-- 用户 -->
            <a-dropdown
                placement="bottomRight"
                :trigger="['click']"
            >
              <div class="user-entry">

                <a-avatar
                    :size="34"
                    class="user-avatar"
                >
                  <template #icon>
                    <user-outlined />
                  </template>
                </a-avatar>

                <div class="user-info">

                  <span class="user-name" :title="accountLabel">
                    {{ accountLabel }}
                  </span>

                  <span class="user-role">
                    {{ signedIn ? '已登录' : '未登录' }}
                  </span>

                </div>

                <down-outlined
                    class="user-arrow"
                />

              </div>

              <template #overlay>

                <a-menu
                    class="user-menu"
                    @click="handleUserMenuClick"
                >

                  <a-menu-item key="profile">
                    <template #icon>
                      <user-outlined />
                    </template>

                    个人中心
                  </a-menu-item>

                  <a-menu-item key="permission">
                    <template #icon>
                      <safety-certificate-outlined />
                    </template>

                    权限中心
                  </a-menu-item>

                  <a-menu-divider />

                  <a-menu-item v-if="!signedIn" key="login">
                    <template #icon>
                      <user-outlined />
                    </template>
                    账号登录
                  </a-menu-item>

                  <a-menu-item v-else key="logout" danger>
                    <template #icon>
                      <logout-outlined />
                    </template>
                    退出登录
                  </a-menu-item>

                </a-menu>

              </template>

            </a-dropdown>

          </div>

        </header>

        <nav class="route-location" aria-label="面包屑导航">
          <a-breadcrumb>
            <a-breadcrumb-item>
              <a-button type="link" class="breadcrumb-home" @click="goHome">首页</a-button>
            </a-breadcrumb-item>
            <a-breadcrumb-item v-if="currentGroupTitle">{{ currentGroupTitle }}</a-breadcrumb-item>
            <a-breadcrumb-item>
              <span class="breadcrumb-current" aria-current="page">{{ currentRouteLabel }}</span>
            </a-breadcrumb-item>
          </a-breadcrumb>
        </nav>

        <div class="tags-view">
          <a-button type="text" shape="circle" class="tags-control" title="向左滚动" aria-label="向左滚动" @click="scrollTags('left')">
            <left-outlined />
          </a-button>

          <div ref="tagsContainer" class="tags-scroll">
            <div class="tags-list">
              <a-button
                  v-for="item in visitedRoutes"
                  :key="item.path"
                  type="text"
                  class="route-tag"
                  :class="{ 'route-tag-active': $route.path === item.path }"
                  @click="handleVisitedClick(item.path)"
              >
                <home-outlined v-if="item.path === '/reports'" class="tag-home-icon" />
                <span class="tag-label">{{ item.label }}</span>
                <close-outlined
                    v-if="item.path !== '/reports'"
                    class="tag-close"
                    @click.stop="closeVisitedRoute(item.path)"
                />
              </a-button>
            </div>
          </div>

          <a-button type="text" shape="circle" class="tags-control" title="向右滚动" aria-label="向右滚动" @click="scrollTags('right')">
            <right-outlined />
          </a-button>
          <a-button type="text" class="tags-refresh" title="刷新当前页面" @click="refreshCurrentPage">
            <reload-outlined />
            <span>刷新</span>
          </a-button>
        </div>

        <!-- ================================
             页面内容
             ================================ -->
        <main class="main-area">

          <router-view v-slot="{ Component, route }">
            <component :is="Component" :key="route.path + ':' + routerViewKey" />
          </router-view>

        </main>

      </section>

    </div>

  </div>
</template>

<script lang="ts">
import { loadAccess } from '@/utils/access'
import { defineComponent } from 'vue'
import SystemLogo from '@/components/SystemLogo.vue'
import { logout } from '@/api/auth'
import { AUTH_CHANGED_EVENT, getAuthorization, getAuthUser } from '@/utils/auth-token'

import {
  Menu,
  MenuItem,
  MenuDivider,
  Avatar,
  Dropdown,
  Button,
  message,
  Divider,
  Input,
  Tooltip,
  Breadcrumb,
  BreadcrumbItem
} from 'ant-design-vue'

import {
  DashboardOutlined,
  MailOutlined,
  RobotOutlined,
  KeyOutlined,
  FileTextOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  UserOutlined,

  SearchOutlined,
  BellOutlined,
  DownOutlined,
  LogoutOutlined,

  HomeOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  ReloadOutlined,

  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons-vue'

interface NavItem {
  path: string
  label: string
  icon: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

interface VisitedRoute {
  path: string
  label: string
}

const VISITED_ROUTES_KEY = 'mpro-visited-routes'
const SIDEBAR_COLLAPSED_KEY =
    'mpro-sidebar-collapsed'
const MAX_VISITED_ROUTES = 12

export default defineComponent({
  name: 'AppLayout',

  components: {
    SystemLogo,
    /*
     * Ant Design Vue
     */
    AMenu: Menu,
    AMenuItem: MenuItem,
    AMenuDivider: MenuDivider,

    AAvatar: Avatar,
    ADropdown: Dropdown,
    AButton: Button,
    ADivider: Divider,
    AInput: Input,

    ATooltip: Tooltip,
    ABreadcrumb: Breadcrumb,
    ABreadcrumbItem: BreadcrumbItem,

    /*
     * Sidebar Icons
     */
    DashboardOutlined,
    MailOutlined,
    RobotOutlined,
    KeyOutlined,
    FileTextOutlined,
    AuditOutlined,
    SafetyCertificateOutlined,
    UserOutlined,

    /*
     * Header
     */
    SearchOutlined,
    BellOutlined,
    DownOutlined,
    LogoutOutlined,

    /*
     * 面包屑和页面标签
     */
    HomeOutlined,
    CloseOutlined,
    LeftOutlined,
    RightOutlined,
    ReloadOutlined,

    /*
     * Sidebar Toggle
     */
    MenuFoldOutlined,
    MenuUnfoldOutlined
  },

  data() {
    return {
      /**
       * 当前菜单
       */
      selectedKeys: [] as string[],

      /**
       * Sidebar 是否收缩
       */
      sidebarCollapsed: false,

      /**
       * 搜索
       */
      searchKeyword: '',
      signedIn: !!getAuthorization(),
      accountLabel: getAuthUser()?.email || '未登录',

      visitedRoutes: [] as VisitedRoute[],
      routerViewKey: 0,

      /**
       * 导航
       */
      navGroups: [
        {
          title: '业务管理',

          items: [
            {
              path: '/reports',
              label: '数据仪表盘',
              icon: 'DashboardOutlined'
            },
            {
              path: '/mail',
              label: '邮箱管理',
              icon: 'MailOutlined'
            },
            {
              path: '/ai-register',
              label: 'AI注册',
              icon: 'RobotOutlined'
            },
            {
              path: '/invite-code',
              label: '邀请码',
              icon: 'KeyOutlined'
            }
          ]
        },

        {
          title: '日志审计',

          items: [
            {
              path: '/register-logs',
              label: '注册日志',
              icon: 'FileTextOutlined'
            },
            {
              path: '/operation-audit',
              label: '操作审计',
              icon: 'AuditOutlined'
            }
          ]
        },

        {
          title: '系统管理',

          items: [
            {
              path: '/permissions',
              label: '权限中心',
              icon: 'SafetyCertificateOutlined'
            }
          ]
        },

        {
          title: '账户',

          items: [
            {
              path: '/profile',
              label: '个人中心',
              icon: 'UserOutlined'
            }
          ]
        }
      ] as NavGroup[]
    }
  },

  computed: {
    currentRouteLabel(): string {
      return this.getRouteLabel(this.$route.path)
    },
    currentGroupTitle(): string {
      for (const group of this.navGroups) {
        if (group.items.some(item => item.path === this.$route.path)) {
          return group.title
        }
      }
      return ''
    }
  },

  created() {
    /*
     * 恢复左侧导航状态
     */
    this.restoreSidebarState()
    this.restoreVisitedRoutes()
    this.ensureHomeTag()

    /*
     * 初始化当前菜单
     */
    this.syncSelectedMenu(
        this.$route.path
    )
    this.addVisitedRoute(this.$route.path)
  },

  mounted() {
    window.addEventListener(AUTH_CHANGED_EVENT, this.syncAuthState)
  },

  beforeUnmount() {
    window.removeEventListener(AUTH_CHANGED_EVENT, this.syncAuthState)
  },

  watch: {
    '$route.path'(
        path: string
    ) {
      this.syncSelectedMenu(path)
      this.addVisitedRoute(path)
      this.$nextTick(() => this.scrollActiveTagIntoView())
    }
  },

  methods: {
    syncAuthState() {
      this.signedIn = !!getAuthorization()
      this.accountLabel = getAuthUser()?.email || '未登录'
    },
    /**
     * 收起 / 展开 Sidebar
     */
    toggleSidebar() {
      this.sidebarCollapsed =
          !this.sidebarCollapsed

      this.saveSidebarState()
    },

    /**
     * 保存 Sidebar 状态
     */
    saveSidebarState() {
      try {
        localStorage.setItem(
            SIDEBAR_COLLAPSED_KEY,
            String(
                this.sidebarCollapsed
            )
        )
      } catch (error) {
        console.warn(
            '保存导航栏状态失败',
            error
        )
      }
    },

    /**
     * 恢复 Sidebar 状态
     */
    restoreSidebarState() {
      try {
        const value =
            localStorage.getItem(
                SIDEBAR_COLLAPSED_KEY
            )

        this.sidebarCollapsed =
            window.innerWidth <= 720 || value === 'true'
      } catch (error) {
        this.sidebarCollapsed = window.innerWidth <= 720
      }
    },

    /**
     * 获取全部菜单
     */
    getAllNavItems(): NavItem[] {
      return this.navGroups.reduce(
          (
              result: NavItem[],
              group: NavGroup
          ) => {
            return [
              ...result,
              ...group.items
            ]
          },
          []
      )
    },

    /**
     * 获取路由中文名称
     */
    getRouteLabel(
        path: string
    ): string {
      const matched =
          this.getAllNavItems()
              .find(
                  item =>
                      item.path === path
              )

      if (matched) {
        return matched.label
      }

      /*
       * Sidebar 外的页面读取 meta.title
       */
      const resolved =
          this.$router.resolve(path)

      const title =
          resolved.meta &&
          resolved.meta.title

      if (
          typeof title ===
          'string'
      ) {
        return title
      }

      return path
    },

    /**
     * Sidebar 当前选中菜单
     */
    syncSelectedMenu(
        path: string
    ) {
      const matched =
          this.getAllNavItems()
              .find(
                  item =>
                      item.path === path
              )

      this.selectedKeys =
          matched
              ? [matched.path]
              : []
    },

    /**
     * 展开状态菜单点击
     */
    handleMenuClick({
                      key
                    }: {
      key: string | number
    }) {
      const path =
          String(key)

      if (
          this.$route.path !== path
      ) {
        this.$router.push(path)
      }
    },

    /**
     * 收缩状态图标点击
     */
    handleCollapsedMenuClick(
        path: string
    ) {
      if (
          this.$route.path !== path
      ) {
        this.$router.push(path)
      }
    },

    /**
     * 返回首页
     */
    goHome() {
      if (this.$route.path !== '/reports') {
        this.$router.push('/reports')
      }
    },

    ensureHomeTag() {
      if (!this.visitedRoutes.some(item => item.path === '/reports')) {
        this.visitedRoutes.unshift({ path: '/reports', label: '数据仪表盘' })
        this.saveVisitedRoutes()
      }
    },

    addVisitedRoute(path: string) {
      if (this.visitedRoutes.some(item => item.path === path)) return
      this.visitedRoutes.push({ path, label: this.getRouteLabel(path) })
      while (this.visitedRoutes.length > MAX_VISITED_ROUTES) {
        const index = this.visitedRoutes.findIndex(item => item.path !== '/reports')
        if (index < 0) break
        this.visitedRoutes.splice(index, 1)
      }
      this.saveVisitedRoutes()
    },

    handleVisitedClick(path: string) {
      if (this.$route.path !== path) this.$router.push(path)
    },

    closeVisitedRoute(path: string) {
      if (path === '/reports') return
      const index = this.visitedRoutes.findIndex(item => item.path === path)
      if (index < 0) return
      const target = this.visitedRoutes[index - 1] || this.visitedRoutes[index + 1]
      const isCurrent = this.$route.path === path
      this.visitedRoutes.splice(index, 1)
      this.saveVisitedRoutes()
      if (isCurrent) this.$router.push(target?.path || '/reports')
    },

    scrollTags(direction: 'left' | 'right') {
      const container = this.$refs.tagsContainer as HTMLElement | undefined
      container?.scrollBy({ left: direction === 'left' ? -260 : 260, behavior: 'smooth' })
    },

    scrollActiveTagIntoView() {
      const container = this.$refs.tagsContainer as HTMLElement | undefined
      const active = container?.querySelector('.route-tag-active') as HTMLElement | null
      active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    },

    async refreshCurrentPage() {
      try {
        await loadAccess(true)
      } catch (error) { message.error(error instanceof Error ? error.message : '权限信息加载失败') }
      this.routerViewKey += 1
    },

    saveVisitedRoutes() {
      try {
        sessionStorage.setItem(VISITED_ROUTES_KEY, JSON.stringify(this.visitedRoutes))
      } catch (error) {
        console.warn('保存访问标签失败', error)
      }
    },

    restoreVisitedRoutes() {
      try {
        const value = sessionStorage.getItem(VISITED_ROUTES_KEY)
        if (!value) return
        const parsed = JSON.parse(value)
        if (!Array.isArray(parsed)) return
        this.visitedRoutes = parsed.filter((item: Partial<VisitedRoute>) =>
          typeof item.path === 'string' && typeof item.label === 'string'
        ).slice(-MAX_VISITED_ROUTES)
      } catch (error) {
        this.visitedRoutes = []
        console.warn('恢复访问标签失败', error)
      }
    },

    /**
     * 全局搜索
     */
    handleGlobalSearch() {
      const keyword =
          this.searchKeyword
              .trim()
              .toLowerCase()

      if (!keyword) {
        return
      }

      const matched =
          this.getAllNavItems()
              .find(
                  item =>
                      item.label
                          .toLowerCase()
                          .includes(keyword)
              )

      if (!matched) {
        console.log(
            '未找到相关菜单：',
            keyword
        )

        return
      }

      this.searchKeyword = ''

      if (
          this.$route.path !==
          matched.path
      ) {
        this.$router.push(
            matched.path
        )
      }
    },

    /**
     * 用户菜单
     */
    async handleUserMenuClick({
                          key
                        }: {
      key: string | number
    }) {
      const action =
          String(key)

      if (
          action === 'profile'
      ) {
        if (
            this.$route.path !==
            '/profile'
        ) {
          this.$router.push(
              '/profile'
          )
        }

        return
      }

      if (
          action === 'permission'
      ) {
        if (
            this.$route.path !==
            '/permissions'
        ) {
          this.$router.push(
              '/permissions'
          )
        }

        return
      }

      if (action === 'login') {
        this.$router.push('/login')
        return
      }

      if (action === 'logout') {
        try {
          await logout()
          message.success('已退出登录')
        } catch (error) {
          message.error(error instanceof Error ? error.message : '退出登录失败')
        } finally {
          this.signedIn = false
          this.accountLabel = '未登录'
          this.$router.replace('/login')
        }
      }
    }
  }
})
</script>

<style scoped>
/* ================================
   页面整体
   ================================ */

.shell-bg {
  width: 100%;
  height: 100vh;

  display: flex;

  overflow: hidden;

  background: #f3f4f6;
}

.shell-card {
  width: 100%;
  height: 100%;

  display: flex;

  overflow: hidden;
}

/* ================================
   Sidebar
   ================================ */

.sidebar {
  --rail-bg: #17181b;
  --rail-label: #a6a7a9;
  --rail-label-hover: #f1f1f0;
  --rail-accent: #fc8805;

  width: 210px;
  min-width: 210px;
  height: 100%;

  flex-shrink: 0;

  display: flex;
  flex-direction: column;

  box-sizing: border-box;

  padding:
      28px 0
      18px;

  background: var(--rail-bg);

  border-right: 1px solid #2b2d30;

  overflow: hidden;

  transition:
      width 0.2s ease,
      min-width 0.2s ease;
}

.sidebar-collapsed {
  width: 72px;
  min-width: 72px;
}

/* ================================
   Logo
   ================================ */

.logo-area {
  height: 42px;
  color: #f3f3f1;

  display: flex;
  align-items: center;

  padding:
      0 24px;

  margin-bottom: 22px;

  flex-shrink: 0;

  transition:
      padding 0.2s ease;
}

.sidebar-collapsed
.logo-area {
  justify-content: center;

  padding: 0;
}

.logo-svg {
  display: block;

  width: 166px;
  height: auto;

  transform:
      scale(0.80, 0.82);

  transform-origin:
      left center;

  flex-shrink: 0;
}

.mini-logo-svg {
  width: 32px;
  height: 32px;

  display: block;
}

/* ================================
   Sidebar Scroll
   ================================ */

.sidebar-scroll {
  flex: 1;

  min-height: 0;

  overflow-x: hidden;
  overflow-y: auto;

  padding-bottom: 16px;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 4px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #43454a;

  border-radius: 999px;
}

/* ================================
   导航分组
   ================================ */

.nav-group {
  margin-bottom: 20px;
}

.nav-group:last-child {
  margin-bottom: 0;
}

.nav-group-title {
  padding:
      0 26px;

  margin-bottom: 6px;

  color: #939598;

  font-size: 12px;
  font-weight: 500;

  line-height: 20px;

  user-select: none;
}

/* 收缩状态分组线 */
.nav-group-divider {
  width: 26px;
  height: 1px;

  margin:
      6px auto
      8px;

  background: #383a3e;
}

/* 第一个分组不显示顶部线 */
.sidebar-collapsed
.nav-group:first-child
.nav-group-divider {
  display: none;
}

/* ================================
   展开菜单
   ================================ */

.main-nav {
  width: 100%;

  padding:
      0 12px;

  background:
      transparent !important;

  border-inline-end:
      none !important;
}

:deep(.ant-menu-inline) {
  border-inline-end:
      none !important;
}

:deep(.ant-menu-item) {
  width: 100% !important;

  height: 42px;

  line-height: 42px;

  margin:
      2px 0 !important;

  padding-inline:
      14px !important;

  border-radius: 8px;

  color: var(--rail-label);

  font-size: 14px;
  font-weight: 500;

  transition:
      background-color 0.15s ease,
      color 0.15s ease;
}

:deep(
  .ant-menu-item
  .anticon
) {
  min-width: 18px;

  color: var(--rail-label);

  font-size: 17px;
}

:deep(
  .ant-menu-item:hover
) {
  color:
      var(--rail-label-hover) !important;

  background:
      #25272b !important;
}

:deep(
  .ant-menu-item:hover
  .anticon
) {
  color:
      var(--rail-label-hover) !important;
}

:deep(
  .ant-menu-item-selected
) {
  color:
      #ffffff !important;

  background:
      #303033 !important;

  font-weight: 600;
}

:deep(
  .ant-menu-item-selected
  .anticon
) {
  color:
      var(--rail-accent) !important;
}

:deep(
  .ant-menu-item-selected:hover
) {
  color: #ffffff !important;
  background: #303033 !important;
}

:deep(
  .ant-menu-item-selected:hover
  .anticon
) {
  color: var(--rail-accent) !important;
}

:deep(
  .ant-menu-item::after
) {
  display: none !important;
}

/* ================================
   收缩导航
   ================================ */

.collapsed-nav {
  width: 100%;

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 4px;
}

.collapsed-nav-item {
  width: 44px;
  height: 42px;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 0;

  border: 0;

  background: transparent;

  color: var(--rail-label);

  font-size: 18px;

  border-radius: 8px;

  cursor: pointer;

  transition:
      color 0.15s ease,
      background-color 0.15s ease;
}

.collapsed-nav-item:hover {
  color: var(--rail-label-hover);

  background: #25272b;
}

.collapsed-nav-item-active {
  color: var(--rail-accent);

  background: #303033;
}

.collapsed-nav-item-active:hover {
  color: var(--rail-accent);

  background: #303033;
}

.collapsed-nav-icon {
  display: inline-flex;

  align-items: center;

  justify-content: center;

  font-size: 18px;

  line-height: 1;
}

.collapsed-nav-item:focus-visible {
  outline:
      2px solid
      var(--rail-accent);

  outline-offset: -2px;
}

/* ================================
   右侧整体
   ================================ */

.right-shell {
  flex: 1;

  min-width: 0;
  height: 100%;

  display: flex;

  flex-direction: column;

  overflow: hidden;

  background: #f3f4f6;
}

/* ================================
   Topbar
   ================================ */

.topbar {
  height: 58px;
  min-height: 58px;

  flex-shrink: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 560px) minmax(0, 1fr);
  align-items: center;

  gap: 20px;

  padding:
      0 28px;

  box-sizing: border-box;

  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

/* ================================
   左侧 Toggle
   ================================ */

.topbar-left {
  min-width: 0;

  display: flex;

  align-items: center;
}

.sidebar-toggle {
  width: 36px;
  height: 36px;

  display: inline-flex !important;

  align-items: center;

  justify-content: center;

  padding: 0 !important;

  color: #64748b;

  font-size: 18px;

  border-radius: 8px;
}

.sidebar-toggle:hover {
  color:
      #2563eb !important;

  background:
      #f1f5f9 !important;
}

/* ================================
   搜索
   ================================ */

.topbar-search {
  width: 100%;
  justify-self: center;
}

.global-search {
  width: 100%;
}

:deep(
  .global-search.ant-input-affix-wrapper
) {
  height: 38px;

  padding:
      0 16px;

  background: #f8fafc;

  border:
      1px solid #e5e7eb;

  border-radius: 999px;

  box-shadow: none;

  transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
}

:deep(
  .global-search.ant-input-affix-wrapper:hover
) {
  background: #ffffff;

  border-color: #cbd5e1;
}

:deep(
  .global-search.ant-input-affix-wrapper-focused
) {
  background: #ffffff;

  border-color: #93b4f5;

  box-shadow:
      0 0 0 3px
      rgba(
          37,
          99,
          235,
          0.08
      );
}

:deep(
  .global-search
  .ant-input
) {
  background: transparent;

  color: #1f2937;

  font-size: 13px;
}

:deep(
  .global-search
  .ant-input::placeholder
) {
  color: #9ca3af;
}

:deep(
  .global-search
  .ant-input-prefix
) {
  margin-right: 8px;

  color: #94a3b8;
}

/* ================================
   顶部右侧
   ================================ */

.topbar-actions {
  justify-self: end;

  display: flex;

  align-items: center;

  gap: 6px;
}

.topbar-icon-btn {
  display: inline-flex;

  align-items: center;

  justify-content: center;

  color: #64748b;

  font-size: 17px;
}

.topbar-icon-btn:hover {
  color:
      #2563eb !important;

  background:
      #f1f5f9 !important;
}

.topbar-divider {
  height: 22px;

  margin:
      0 4px;

  border-color:
      #e5e7eb;
}

/* ================================
   用户
   ================================ */

.user-entry {
  height: 46px;

  display: flex;

  align-items: center;

  gap: 10px;

  padding:
      0 8px;

  border-radius: 8px;

  cursor: pointer;

  transition:
      background-color 0.15s ease;
}

.user-entry:hover {
  background: #f8fafc;
}

.user-avatar {
  flex-shrink: 0;

  background: #eaf2ff;

  color: #2563eb;
}

.user-info {
  display: flex;

  flex-direction: column;

  align-items: flex-start;

}

.user-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2937;

  font-size: 13px;

  font-weight: 600;

  line-height: 17px;
}

.user-role {
  color: #94a3b8;

  font-size: 11px;

  line-height: 15px;
}

.user-arrow {
  color: #94a3b8;

  font-size: 10px;
}

.user-menu {
  min-width: 160px;
}

/* ================================
   面包屑
   ================================ */

.route-location {
  height: 38px;
  min-height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 24px;
  box-sizing: border-box;
  background: #ffffff;
  border-bottom: 1px solid #eef0f3;
}

:deep(.route-location .ant-breadcrumb) {
  color: #94a3b8;
  font-size: 13px;
}

:deep(.route-location .ant-breadcrumb-separator) {
  color: #cbd5e1;
  margin-inline: 8px;
}

.breadcrumb-home {
  padding: 0;
  border: 0;
  background: transparent;
  color: #475569;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.breadcrumb-home:hover {
  color: #2563eb;
}

.breadcrumb-current {
  color: #94a3b8;
}

/* ================================
   Tags View
   ================================ */

.tags-view {
  height: 48px;
  min-height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.tags-control {
  width: 30px;
  min-width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.tags-control:hover {
  color: #2563eb;
  background: #eaf3ff;
}

.tags-scroll {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.tags-scroll::-webkit-scrollbar {
  display: none;
}

.tags-list {
  min-width: max-content;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
}

.route-tag {
  height: 32px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.route-tag:hover {
  color: #2563eb;
  background: #edf3ff;
}

.route-tag-active {
  color: #2563eb;
  background: #eaf3ff;
  font-weight: 600;
}

.route-tag-active:hover {
  background: #eaf3ff;
}

.tag-home-icon {
  font-size: 13px;
}

.tag-label {
  line-height: 20px;
}

.tag-close {
  margin-left: 1px;
  padding: 3px;
  color: #94a3b8;
  font-size: 9px;
  border-radius: 50%;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.tag-close:hover {
  color: #dc2626;
  background: #fee2e2;
}

.tags-refresh {
  min-width: 70px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.tags-refresh:hover {
  color: #2563eb;
  background: #eaf3ff;
}

.breadcrumb-home:focus-visible,
.route-tag:focus-visible,
.tags-control:focus-visible,
.tags-refresh:focus-visible,
.sidebar-toggle:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.28);
  outline-offset: -2px;
}
/* ================================
   Main
   ================================ */

.main-area {
  flex: 1;

  min-width: 0;
  min-height: 0;

  overflow-x: hidden;
  overflow-y: auto;

  background: #f3f4f6;
}

.main-area::-webkit-scrollbar {
  width: 6px;
}

.main-area::-webkit-scrollbar-track {
  background: transparent;
}

.main-area::-webkit-scrollbar-thumb {
  background: #d1d5db;

  border-radius: 999px;
}

.main-area::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* ================================
   中等屏幕
   ================================ */

@media (
max-width: 1050px
) {
  .topbar {
    grid-template-columns: minmax(160px, 1fr) minmax(300px, 460px) auto;
    gap: 14px;
    padding: 0 18px;
  }

  .route-location {
    padding: 0 18px;
  }
}

@media (
max-width: 900px
) {
  .topbar {
    grid-template-columns: minmax(64px, 1fr) minmax(200px, 460px) auto;
  }

  .user-info,
  .user-arrow {
    display: none;
  }
}

/* ================================
   小屏
   ================================ */

@media (
max-width: 720px
) {
  .sidebar {
    width: 190px;
    min-width: 190px;
  }

  .sidebar-collapsed {
    width: 72px;
    min-width: 72px;
  }

  .topbar {
    display: flex;

    gap: 10px;

    padding:
        0 14px;
  }

  .topbar-left,
  .topbar-actions {
    flex-shrink: 0;
  }

  .topbar-search {
    flex: 1;
  }

  .route-location {
    padding: 0 14px;
  }

  .tags-refresh {
    min-width: 38px;
    padding: 0;
  }

  .tags-refresh span {
    display: none;
  }
}

/* ================================
   超小屏
   ================================ */

@media (
max-width: 560px
) {
  .topbar-search {
    display: none;
  }

  .topbar {
    justify-content:
        space-between;
  }

  .route-location {
    display: none;
  }
}

/* ================================
   减少动画
   ================================ */

@media (
prefers-reduced-motion:
    reduce
) {
  .sidebar {
    transition: none;
  }
}
</style>
