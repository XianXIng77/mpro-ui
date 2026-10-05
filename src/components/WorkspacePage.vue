<template>
  <a-config-provider :locale="locale" :theme="themeConfig" :component-size="preferences.appearance.compact ? 'small' : 'middle'">
    <div class="workspace-page" :data-theme="isDark ? 'dark' : 'light'"><slot /></div>
  </a-config-provider>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { ConfigProvider, theme } from 'ant-design-vue'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { profileApi } from '@/api/profile'
import { getAuthorization } from '@/utils/auth-token'
import { profilePreferences, applyProfilePreferences } from '@/utils/profile-preferences'
export default defineComponent({
  name: 'WorkspacePage', components: { AConfigProvider: ConfigProvider },
  props: { loadPreferences: { type: Boolean, default: true } },
  data() { return { preferences: profilePreferences, locale: zhCN, systemDark: false, media: null as MediaQueryList | null } },
  computed: {
    isDark(): boolean { return this.preferences.appearance.mode === 'dark' || this.preferences.appearance.mode === 'system' && this.systemDark },
    themeConfig(): ThemeConfig { return { algorithm: this.isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: this.preferences.appearance.color } } }
  },
  mounted() {
    this.media = window.matchMedia('(prefers-color-scheme: dark)')
    this.systemDark = this.media.matches
    this.media.addEventListener('change', this.updateSystemTheme)
    if (this.loadPreferences) this.loadAppearance()
  },
  beforeUnmount() { this.media?.removeEventListener('change', this.updateSystemTheme) },
  methods: {
    updateSystemTheme(event: MediaQueryListEvent) { this.systemDark = event.matches },
    async loadAppearance() {
      const authorization = getAuthorization()
      if (!authorization) return
      try {
        const preferences = await profileApi.preferences()
        if (getAuthorization() === authorization) applyProfilePreferences(preferences)
      } catch { /* 偏好加载失败不阻断页面主功能。 */ }
    }
  }
})
</script>
<style>
.workspace-page { --surface: #fff; --subtle: #f8fafc; --line: #e5e7eb; --muted: #64748b; --ink: #262626; padding: 16px 28px 28px; min-height: 100%; color: var(--ink); }
.workspace-page[data-theme="dark"] { --surface: #1f1f1f; --subtle: #252525; --line: #424242; --muted: #a6b1c1; --ink: #ededed; background: #141414; }
.workspace-page .page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 4px 0 20px; }
.workspace-page .page-heading h1 { margin: 0 0 6px; font-size: 22px; font-weight: 600; color: var(--ink); }
.workspace-page .page-heading p { margin: 0; color: var(--muted); line-height: 1.7; }
.workspace-page .workspace-card { border-color: var(--line); border-radius: 14px; overflow: hidden; }
.workspace-page .workspace-toolbar { min-height: 68px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px 20px; }
.workspace-page .toolbar-end { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.workspace-page .workspace-search { width: 240px; }
.workspace-page .muted { color: var(--muted); }
.workspace-page .section-title { font-size: 16px; font-weight: 600; margin: 0 0 8px; color: var(--ink); }
.workspace-page .section-description { color: var(--muted); margin: 0 0 20px; line-height: 1.7; }
.workspace-page .ant-table-thead > tr > th { background: var(--subtle); color: var(--muted); font-weight: 600; text-align: center; }
.workspace-page .ant-table-tbody > tr > .ant-table-cell-fix-right { background: var(--surface); }
.workspace-page .ant-table-tbody > tr:hover > .ant-table-cell-fix-right { background: var(--subtle); }
.workspace-page .ant-table-pagination { padding-inline: 20px; }
.workspace-page .ant-tag { margin-inline-end: 0; }
.workspace-page[data-theme="light"] .ant-tag-success { color: #237804; }
.workspace-page[data-theme="light"] .ant-tag-warning { color: #874d00; }
.workspace-page .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.workspace-page .ant-tabs-nav { padding: 0 20px; margin: 0; }
.workspace-page .ant-tabs-content-holder { padding: 24px; }
.workspace-page .form-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 24px; }
@media (max-width: 900px) { .workspace-page { padding: 16px; } .workspace-page .toolbar-end { width: 100%; margin-left: 0; } .workspace-page .workspace-search { flex: 1; min-width: 0; } }
@media (max-width: 600px) { .workspace-page .workspace-toolbar { padding: 14px; } .workspace-page .ant-tabs-content-holder { padding: 16px; } }
</style>
