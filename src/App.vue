<template>
  <a-config-provider :theme="{}">
    <router-view />
  </a-config-provider>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { ConfigProvider, message } from 'ant-design-vue'
import { ACCESS_INVALIDATED_EVENT, AUTH_CHANGED_EVENT, getAuthorization, getAuthExpiresAt } from '@/utils/auth-token'

import { clearAccess, loadAccess } from '@/utils/access'

export default defineComponent({
  name: 'App',
  components: { AConfigProvider: ConfigProvider },
  data() { return { expiryTimer: 0 } },
  mounted() {
    window.addEventListener(ACCESS_INVALIDATED_EVENT, this.refreshAccess)
    window.addEventListener(AUTH_CHANGED_EVENT, this.syncAuthentication)
    window.addEventListener('storage', this.syncAuthentication)
    window.addEventListener('focus', this.syncAuthentication)
    this.syncAuthentication()
  },
  beforeUnmount() {
    window.removeEventListener(ACCESS_INVALIDATED_EVENT, this.refreshAccess)
    window.removeEventListener(AUTH_CHANGED_EVENT, this.syncAuthentication)
    window.removeEventListener('storage', this.syncAuthentication)
    window.removeEventListener('focus', this.syncAuthentication)
    window.clearTimeout(this.expiryTimer)
  },
  methods: {
    refreshAccess() { return loadAccess(true).catch(this.accessError) },
    accessError(error: unknown) {
      if (getAuthorization()) message.error(error instanceof Error ? error.message : '权限信息加载失败，请刷新重试')
    },
    syncAuthentication() {
      window.clearTimeout(this.expiryTimer)
      if (!getAuthorization()) {
        clearAccess()
        if (this.$route.meta.requiresAuth) {
          this.$router.replace({ path: '/login', query: { redirect: this.$route.fullPath } })
        }
        return
      }
      // 功能权限后台加载，不阻塞页面和导航。
      loadAccess().catch(this.accessError)
      const expiresAt = getAuthExpiresAt()
      if (expiresAt !== null) {
        this.expiryTimer = window.setTimeout(this.syncAuthentication, Math.min(Math.max(1, expiresAt - Date.now()), 2147483647))
      }
    }
  }
})
</script>

<style>
*, *::before, *::after {
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  color: #262626;
  background: #fff;
}
</style>
