<template>
  <workspace-page :load-preferences="false">
    <div v-if="loading" class="profile-loading"><a-spin tip="正在加载个人资料" /></div>
    <a-alert v-else-if="loadError" type="error" show-icon :message="loadError">
      <template #action><a-button @click="loadProfile">重试</a-button></template>
    </a-alert>
    <div v-else-if="profile" class="profile-center">
      <aside class="profile-sidebar" aria-label="账号信息">
        <a-card class="workspace-card account-card" :body-style="{ padding: '28px 24px' }">
          <div class="account-identity">
            <a-avatar :size="80" :src="profile.avatar || undefined" :style="{ backgroundColor: profile.avatarColor }" class="account-avatar">
              {{ profile.username.slice(0, 1) }}
            </a-avatar>
            <h1>{{ profile.username }}</h1>
            <a-tag :color="profile.role === 'owner' ? 'gold' : profile.role === 'admin' ? 'blue' : undefined">{{ roleLabel }}</a-tag>
            <a-typography-text class="account-email" :ellipsis="{ tooltip: profile.email }">{{ profile.email }}</a-typography-text>
          </div>
          <a-divider />
          <a-descriptions :column="1" :colon="false" size="small" class="account-details">
            <a-descriptions-item label="加入时间">{{ profile.joinedAt.slice(0, 10) || '暂无记录' }}</a-descriptions-item>
            <a-descriptions-item label="手机号码">{{ profile.phone || '未填写' }}</a-descriptions-item>
          </a-descriptions>
          <div class="account-bio">
            <span class="detail-label">个人简介</span>
            <p>{{ profile.bio || '还没有填写个人简介' }}</p>
          </div>
          <div class="account-device">
            <DesktopOutlined aria-hidden="true" />
            <div><span>当前设备</span><strong>{{ deviceLabel }}</strong></div>
          </div>
        </a-card>
        <a-card class="workspace-card activity-card" title="最近活动" :body-style="{ padding: '4px 24px 8px' }">
          <a-alert v-if="activityError" type="error" show-icon :message="activityError">
            <template #action><a-button size="small" @click="loadActivities">重试</a-button></template>
          </a-alert>
          <a-list :data-source="activities" :loading="activitiesLoading" :locale="{ emptyText: activityError ? '活动加载失败' : '暂无近期活动' }" size="small">
            <template #renderItem="{ item }">
              <a-list-item class="activity-item">
                <div class="activity-content">
                  <div class="activity-heading">
                    <span>{{ item.action }}</span>
                    <a-tag :color="item.status === '成功' ? 'success' : 'error'">{{ item.status }}</a-tag>
                  </div>
                  <a-typography-text class="activity-description" :ellipsis="{ tooltip: item.detail }">{{ item.detail }}</a-typography-text>
                  <time class="activity-time" :datetime="item.time.replace(' ', 'T')">{{ item.time }}</time>
                </div>
              </a-list-item>
            </template>
          </a-list>
          <a-button class="activity-link" type="link" block @click="$router.push('/operation-audit')">查看操作记录<RightOutlined /></a-button>
        </a-card>
      </aside>

      <a-card class="workspace-card settings-card" :body-style="{ padding: 0 }">
        <a-tabs :active-key="activeTab" class="settings-tabs" @change="changeTab">
          <a-tab-pane key="basic">
            <template #tab><span class="settings-tab"><UserOutlined />基本资料</span></template>
            <a-form ref="profileForm" :model="draft" layout="vertical" class="profile-form" :required-mark="false" @finish="saveProfile">
              <div class="avatar-editor">
                <a-avatar :size="64" :src="draft.avatar || undefined" :style="{ backgroundColor: draft.avatarColor }">{{ draft.username.trim().slice(0, 1) || '用' }}</a-avatar>
                <div class="avatar-controls">
                  <a-space wrap :size="8">
                    <a-upload accept="image/png,image/jpeg,image/webp" :show-upload-list="false" :before-upload="uploadAvatar" :disabled="!hasPermission('profile:update') || saving || avatarLoading">
                      <a-button :loading="avatarLoading" :disabled="!hasPermission('profile:update') || saving"><template #icon><UploadOutlined aria-hidden="true" /></template>更换头像</a-button>
                    </a-upload>
                    <a-button v-if="draft.avatar" type="text" :disabled="!hasPermission('profile:update') || saving || avatarLoading" @click="draft.avatar = ''">移除头像</a-button>
                  </a-space>
                  <p>支持 JPG、PNG、WebP，最大 8MB</p>
                </div>
              </div>
              <a-form-item label="默认头像颜色" class="avatar-color-field">
                <a-radio-group :value="draft.avatarColor" :disabled="!hasPermission('profile:update') || saving || !!draft.avatar" aria-label="默认头像颜色" class="color-options" @change="draft.avatarColor = $event.target.value">
                  <a-radio-button v-for="(color, index) in avatarColors" :key="color" :value="color" :aria-label="colorNames[index]">
                    <span class="color-dot" :style="{ backgroundColor: color }" />{{ colorNames[index] }}
                  </a-radio-button>
                </a-radio-group>
                <span v-if="draft.avatar" class="field-hint">移除图片头像后可设置默认颜色。</span>
              </a-form-item>
              <a-divider class="form-divider" />
              <a-row :gutter="[24, 0]">
                <a-col :xs="24" :md="12">
                  <a-form-item label="用户名" name="username" :rules="[{ required: true, whitespace: true, message: '请填写用户名' }, { validator: validateUsername }]">
                    <a-input v-model:value="draft.username" :maxlength="40" :disabled="!hasPermission('profile:update') || saving" placeholder="请输入用户名" autocomplete="nickname" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :md="12">
                  <a-form-item label="手机号码" name="phone" :rules="[{ pattern: /^\+?[0-9\s-]{6,20}$/, message: '请填写有效的手机号码' }]">
                    <a-input v-model:value="draft.phone" :maxlength="20" :disabled="!hasPermission('profile:update') || saving" placeholder="填写手机号码（选填）" autocomplete="tel" />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="邮箱账号" class="email-field">
                    <a-input :value="profile.email" disabled aria-label="邮箱账号"><template #prefix><MailOutlined /></template><template #suffix><LockOutlined /></template></a-input>
                    <span class="field-hint">邮箱用于登录，暂不支持修改。</span>
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="个人简介" name="bio">
                    <a-textarea v-model:value="draft.bio" :maxlength="180" show-count :auto-size="{ minRows: 3, maxRows: 5 }" :disabled="!hasPermission('profile:update') || saving" placeholder="介绍一下你的工作或职责" />
                  </a-form-item>
                </a-col>
              </a-row>
              <div class="settings-footer">
                <span class="save-state"><a-badge :status="profileDirty ? 'processing' : 'default'" />{{ profileDirty ? '有尚未保存的修改' : '资料已同步' }}</span>
                <a-space :size="10">
                  <a-button :disabled="!profileDirty || saving || avatarLoading" @click="resetProfile">重置</a-button>
                  <a-button v-if="hasPermission('profile:update')" type="primary" html-type="submit" :loading="saving" :disabled="!profileDirty || avatarLoading"><template #icon><SaveOutlined aria-hidden="true" /></template>保存资料</a-button>
                </a-space>
              </div>
            </a-form>
          </a-tab-pane>

          <a-tab-pane key="security">
            <template #tab><span class="settings-tab"><SafetyCertificateOutlined />账号安全</span></template>
            <a-list class="settings-list security-list">
              <a-list-item>
                <a-list-item-meta title="登录密码" description="定期更新密码，建议组合使用字母、数字和符号。"><template #avatar><span class="setting-icon"><LockOutlined /></span></template></a-list-item-meta>
                <a-button v-if="hasPermission('profile:update')" @click="passwordOpen = true">修改密码</a-button>
              </a-list-item>
              <a-list-item>
                <a-list-item-meta title="登录邮箱" :description="profile.email"><template #avatar><span class="setting-icon"><MailOutlined /></span></template></a-list-item-meta>
                <a-tag class="subtle-tag">登录账号</a-tag>
              </a-list-item>
              <a-list-item>
                <a-list-item-meta title="操作记录" description="查看账号登录、密码和权限变更记录。"><template #avatar><span class="setting-icon"><HistoryOutlined /></span></template></a-list-item-meta>
                <a-button @click="$router.push('/operation-audit')">查看记录<RightOutlined /></a-button>
              </a-list-item>
            </a-list>
            <div class="device-section">
              <div class="subsection-heading"><h2>当前登录设备</h2><a-tag color="success">当前会话</a-tag></div>
              <div class="device-detail"><span class="device-symbol"><DesktopOutlined /></span><div><strong>{{ deviceLabel }}</strong><p>你正在使用此设备访问工作台</p></div></div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="notifications">
            <template #tab><span class="settings-tab"><BellOutlined />通知偏好</span></template>
            <a-list class="settings-list notification-list" :data-source="noticeOptions">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta :title="item.title" :description="item.description">
                    <template #avatar><span class="setting-icon"><component :is="item.icon" /></span></template>
                  </a-list-item-meta>
                  <a-switch :checked="preferences.notices[item.key]" :disabled="!hasPermission('profile:update') || preferencesSaving" :aria-label="item.title" @change="changePreferences('notices', { [item.key]: $event })" />
                </a-list-item>
              </template>
            </a-list>
            <div class="preference-note"><CheckCircleOutlined /><span>{{ preferencesSaving ? '正在保存偏好…' : '更改后自动保存到当前账号。' }}</span></div>
          </a-tab-pane>

          <a-tab-pane key="appearance">
            <template #tab><span class="settings-tab"><BgColorsOutlined />外观偏好</span></template>
            <a-form layout="vertical" class="appearance-form">
              <a-form-item label="显示模式">
                <a-radio-group :value="preferences.appearance.mode" :disabled="!hasPermission('profile:update') || preferencesSaving" aria-label="显示模式" class="mode-options" @change="changePreferences('appearance', { mode: $event.target.value })">
                  <a-radio-button v-for="mode in displayModes" :key="mode.value" :value="mode.value" :aria-label="mode.label">
                    <span class="mode-preview" :class="'mode-preview-' + mode.value" aria-hidden="true"><span class="preview-sidebar" /><span class="preview-main"><span class="preview-bar" /><span class="preview-block" /><span class="preview-lines" /></span></span>
                    <span class="mode-label">{{ mode.label }}<CheckCircleFilled v-if="preferences.appearance.mode === mode.value" /><span v-else class="mode-unselected" /></span>
                  </a-radio-button>
                </a-radio-group>
              </a-form-item>
              <a-form-item label="主题颜色" class="theme-color-field">
                <a-radio-group :value="preferences.appearance.color" :disabled="!hasPermission('profile:update') || preferencesSaving" aria-label="主题颜色" class="color-options" @change="changePreferences('appearance', { color: $event.target.value })">
                  <a-radio-button v-for="(color, index) in avatarColors" :key="color" :value="color" :aria-label="colorNames[index]"><span class="color-dot" :style="{ backgroundColor: color }" />{{ colorNames[index] }}</a-radio-button>
                </a-radio-group>
              </a-form-item>
              <div class="density-setting"><div><h2>紧凑布局</h2><p>缩小控件和表格间距，让同一屏显示更多内容。</p></div><a-switch :checked="preferences.appearance.compact" :disabled="!hasPermission('profile:update') || preferencesSaving" aria-label="紧凑布局" @change="changePreferences('appearance', { compact: $event })" /></div>
            </a-form>
            <div class="preference-note"><CheckCircleOutlined /><span>{{ preferencesSaving ? '正在保存偏好…' : '自动保存到当前账号，应用于操作审计、权限中心和个人中心。' }}</span></div>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <password-modal v-if="hasPermission('profile:update')" :open="passwordOpen" @close="passwordOpen = false" @saving="passwordSaving = $event" />
  </workspace-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { hasPermission } from '@/utils/access'
import { Alert, Avatar, Badge, Button, Card, Col, Descriptions, Divider, Form, Input, List, Modal, Radio, Row, Space, Spin, Switch, Tabs, Tag, Typography, Upload, message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { BellOutlined, BgColorsOutlined, CheckCircleFilled, CheckCircleOutlined, DesktopOutlined, FileTextOutlined, HistoryOutlined, LockOutlined, MailOutlined, RightOutlined, SafetyCertificateOutlined, SaveOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons-vue'
import WorkspacePage from '@/components/WorkspacePage.vue'
import PasswordModal from './components/PasswordModal.vue'
import { profileApi, ProfileInput, ProfileActivity, ProfilePreferences, UserProfile } from '@/api/profile'
import { getAuthorization } from '@/utils/auth-token'
import { profilePreferences, applyProfilePreferences } from '@/utils/profile-preferences'
import { AVATAR_COLORS } from '@/constants/access'
import { readAvatar } from '@/utils/profile-avatar'

export default defineComponent({
  name: 'ProfilePage',
  components: {
    WorkspacePage, PasswordModal,
    AAlert: Alert, AAvatar: Avatar, ABadge: Badge, AButton: Button, ACard: Card, ACol: Col,
    ADescriptions: Descriptions, ADescriptionsItem: Descriptions.Item, ADivider: Divider,
    AForm: Form, AFormItem: Form.Item, AInput: Input, ATextarea: Input.TextArea,
    AList: List, AListItem: List.Item, AListItemMeta: List.Item.Meta,
    ARadioGroup: Radio.Group, ARadioButton: Radio.Button, ARow: Row, ASpace: Space, ASpin: Spin, ASwitch: Switch,
    ATabs: Tabs, ATabPane: Tabs.TabPane, ATag: Tag, ATypographyText: Typography.Text, AUpload: Upload,
    BellOutlined, BgColorsOutlined, CheckCircleFilled, CheckCircleOutlined, DesktopOutlined,
    FileTextOutlined, HistoryOutlined, LockOutlined, MailOutlined, RightOutlined,
    SafetyCertificateOutlined, SaveOutlined, UploadOutlined, UserOutlined
  },
  data() {
    return {
      profile: null as UserProfile | null,
      draft: { username: '', phone: '', bio: '', avatar: '', avatarColor: '#1677ff' } as ProfileInput,
      preferences: profilePreferences,
      preferencesSaving: false,
      loading: true,
      loadError: '',
      requestId: 0,
      activities: [] as ProfileActivity[],
      activitiesLoading: false,
      activityError: '',
      activityRequestId: 0,
      activeTab: 'basic',
      saving: false,
      avatarLoading: false,
      passwordOpen: false,
      passwordSaving: false,
      avatarColors: AVATAR_COLORS,
      colorNames: ['蓝色', '紫色', '绿色', '橙色', '玫红'],
      displayModes: [
        { value: 'light', label: '浅色模式' },
        { value: 'dark', label: '深色模式' },
        { value: 'system', label: '跟随系统' }
      ],
      noticeOptions: [
        { key: 'product' as const, icon: 'BellOutlined', title: '工作台动态', description: '新邮件、自动化任务和注册结果提醒。' },
        { key: 'security' as const, icon: 'SafetyCertificateOutlined', title: '安全提醒', description: '账号登录、密码修改和权限变更提醒。' },
        { key: 'digest' as const, icon: 'FileTextOutlined', title: '每周摘要', description: '汇总每周工作台活动与处理结果。' }
      ]
    }
  },
  computed: {
    profileDirty(): boolean {
      return !!this.profile && (Object.keys(this.draft) as Array<keyof ProfileInput>)
        .some(key => this.draft[key] !== this.profile?.[key])
    },
    roleLabel(): string {
      const labels: Record<string, string> = { owner: '站主', admin: '管理员', user: '普通用户' }
      return labels[this.profile?.role || 'user'] || this.profile?.role || '普通用户'
    },
    deviceLabel(): string {
      const ua = navigator.userAgent
      const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Macintosh/.test(ua) ? 'macOS' : '当前系统'
      const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '当前浏览器'
      return `${os} · ${browser}`
    }
  },
  mounted() { this.loadProfile() },
  beforeUnmount() { this.requestId += 1; this.activityRequestId += 1 },
  beforeRouteLeave(): boolean | Promise<boolean> {
    if (!getAuthorization()) return true
    if (this.saving || this.avatarLoading || this.passwordSaving || this.preferencesSaving) return false
    if (!this.profileDirty) return true
    return new Promise<boolean>(resolve => Modal.confirm({
      title: '个人资料尚未保存',
      content: '离开后将放弃本次资料修改。',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: () => resolve(true),
      onCancel: () => resolve(false)
    }))
  },
  methods: {
    hasPermission,
    async loadProfile() {
      const requestId = ++this.requestId
      this.loading = true
      this.loadError = ''
      try {
        const profile = await profileApi.get()
        if (requestId !== this.requestId) return
        this.applyProfile(profile)
        this.loadActivities()
      } catch (error) {
        if (requestId === this.requestId) this.loadError = this.errorText(error)
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    applyProfile(profile: UserProfile) {
      this.profile = profile
      this.resetProfile()
      applyProfilePreferences(profile.preferences)
    },
    async loadActivities() {
      const requestId = ++this.activityRequestId
      this.activitiesLoading = true
      this.activityError = ''
      try {
        const activities = await profileApi.activities()
        if (requestId === this.activityRequestId) this.activities = activities
      } catch (error) {
        if (requestId === this.activityRequestId) this.activityError = this.errorText(error)
      } finally {
        if (requestId === this.activityRequestId) this.activitiesLoading = false
      }
    },
    changeTab(key: string) {
      if (!this.saving && !this.avatarLoading) this.activeTab = key
    },
    async uploadAvatar(file: File) {
      if (this.saving || this.avatarLoading) return false
      this.avatarLoading = true
      try {
        this.draft.avatar = await readAvatar(file)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '图片读取失败')
      } finally {
        this.avatarLoading = false
      }
      return false
    },
    validateUsername(_rule: unknown, value: string) {
      const length = (value || '').trim().length
      return length && (length < 2 || length > 40) ? Promise.reject(new Error('用户名为 2–40 个字符')) : Promise.resolve()
    },
    resetProfile() {
      if (!this.profile) return
      const { username, phone, bio, avatar, avatarColor } = this.profile
      this.draft = { username, phone, bio, avatar, avatarColor }
      ;(this.$refs.profileForm as FormInstance)?.clearValidate()
    },
    async saveProfile() {
      if (this.saving || this.avatarLoading || !this.profileDirty) return
      this.saving = true
      try {
        this.applyProfile(await profileApi.update(this.draft))
        message.success('个人资料已保存')
        this.loadActivities()
      } catch (error) {
        message.error(this.errorText(error))
      } finally {
        this.saving = false
      }
    },
    async changePreferences<K extends keyof ProfilePreferences>(section: K, changes: Partial<ProfilePreferences[K]>) {
      if (this.preferencesSaving) return
      const authorization = getAuthorization()
      this.preferencesSaving = true
      try {
        const saved = await profileApi.savePreferences({
          ...this.preferences, [section]: { ...this.preferences[section], ...changes }
        })
        if (getAuthorization() !== authorization) return
        applyProfilePreferences(saved)
        this.loadActivities()
      } catch (error) {
        message.error(this.errorText(error))
      } finally {
        this.preferencesSaving = false
      }
    },
    errorText(error: unknown) {
      return error instanceof Error ? error.message : '操作失败，请稍后重试'
    }
  }
})
</script>

<style scoped>
.profile-loading { display: flex; justify-content: center; padding: 80px 24px; }
.profile-center { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 22px; align-items: start; }
.profile-sidebar, .settings-card { min-width: 0; }
.profile-sidebar { display: flex; flex-direction: column; gap: 22px; }
.activity-card :deep(.ant-card-head) { padding: 0 24px; }
.activity-card :deep(.ant-card-head-title) { font-size: 14px; }
.activity-card :deep(.activity-item) { padding: 16px 0; }
.activity-content { width: 100%; min-width: 0; }
.activity-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--ink); }
.activity-heading > span:first-child { min-width: 0; overflow-wrap: anywhere; }
.activity-heading :deep(.ant-tag) { flex-shrink: 0; }
.activity-description { display: block; margin-top: 8px; color: var(--muted); font-size: 12px; }
.activity-time { display: block; margin-top: 6px; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.activity-link { margin: 4px 0; }
.account-card, .settings-card { box-shadow: 0 3px 14px rgb(15 23 42 / 3%); }
.account-identity { display: flex; flex-direction: column; align-items: center; text-align: center; }
.account-avatar { font-size: 30px; flex-shrink: 0; box-shadow: 0 0 0 6px var(--subtle); margin: 6px 0 22px; }
.account-identity h1 { color: var(--ink); font-size: 21px; font-weight: 600; margin: 0 0 10px; overflow-wrap: anywhere; max-width: 100%; }
.account-email { display: block; max-width: 100%; margin-top: 14px; color: var(--muted); font-size: 12px; }
.account-card :deep(.ant-divider) { margin: 24px 0; border-color: var(--line); }
.account-details :deep(.ant-descriptions-item-container) { justify-content: space-between; gap: 16px; }
.account-details :deep(.ant-descriptions-item-label) { color: var(--muted); font-size: 12px; }
.account-details :deep(.ant-descriptions-item-content) { justify-content: flex-end; color: var(--ink); font-size: 12px; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.account-details :deep(.ant-descriptions-row > td) { padding-bottom: 16px; }
.detail-label { color: var(--muted); font-size: 12px; }
.account-bio p { color: var(--ink); font-size: 12px; line-height: 1.9; margin: 8px 0 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.account-device { display: flex; align-items: center; gap: 12px; margin-top: 24px; padding: 14px; background: var(--subtle); border-radius: 10px; }
.account-device > .anticon { color: var(--muted); font-size: 22px; }
.account-device > div { display: flex; flex-direction: column; gap: 5px; }
.account-device span { color: var(--muted); font-size: 11px; }
.account-device strong { color: var(--ink); font-size: 12px; font-weight: 500; }
.profile-center .settings-tabs :deep(.ant-tabs-nav) { padding: 0 28px; }
.profile-center .settings-tabs :deep(.ant-tabs-content-holder) { padding: 28px; }
.settings-tabs :deep(.ant-tabs-tab) { padding: 20px 0; }
.settings-tab { display: inline-flex; align-items: center; gap: 8px; }
.settings-tab :deep(.anticon) { margin-right: 0; }
.profile-form { width: 100%; }
.profile-form :deep(.ant-form-item-label > label), .appearance-form :deep(.ant-form-item-label > label) { font-size: 13px; font-weight: 500; }
.avatar-editor { display: flex; align-items: center; gap: 18px; padding: 20px; background: var(--subtle); border-radius: 10px; margin-bottom: 22px; }
.avatar-editor > .ant-avatar { flex-shrink: 0; }
.avatar-controls { min-width: 0; }
.avatar-controls p { color: var(--muted); font-size: 12px; line-height: 1.7; margin: 10px 0 0; }
.color-options { display: flex; flex-wrap: wrap; gap: 8px; }
.color-options :deep(.ant-radio-button-wrapper) { display: inline-flex; align-items: center; border-radius: 6px; border-inline-start-width: 1px; font-size: 12px; }
.color-options :deep(.ant-radio-button-wrapper::before), .mode-options :deep(.ant-radio-button-wrapper::before) { display: none; }
.color-dot { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-right: 7px; vertical-align: -1px; }
.avatar-color-field { margin-bottom: 0; }
.form-divider { margin: 24px 0; border-color: var(--line); }
.field-hint { display: block; margin-top: 8px; color: var(--muted); font-size: 12px; line-height: 1.7; }
.email-field :deep(.ant-input-prefix) { margin-right: 8px; }
.settings-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-top: 1px solid var(--line); padding-top: 22px; margin-top: 12px; }
.save-state { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; }
.settings-list :deep(.ant-list-item) { gap: 22px; padding: 24px 0; }
.settings-list :deep(.ant-list-item:first-child) { padding-top: 4px; }
.settings-list :deep(.ant-list-item-meta) { align-items: flex-start; }
.settings-list :deep(.ant-list-item-meta-title) { color: var(--ink); font-size: 14px; font-weight: 600; margin-bottom: 6px; }
.settings-list :deep(.ant-list-item-meta-description) { color: var(--muted); font-size: 12px; line-height: 1.9; overflow-wrap: anywhere; }
.settings-list :deep(.ant-list-item-meta-avatar) { margin-inline-end: 14px; }
.settings-list :deep(.ant-list-item > .ant-btn), .settings-list :deep(.ant-list-item > .ant-switch), .settings-list :deep(.ant-list-item > .ant-tag) { flex-shrink: 0; }
.setting-icon { display: grid; place-items: center; width: 42px; height: 42px; color: var(--muted); background: var(--subtle); border: 1px solid var(--line); border-radius: 10px; font-size: 19px; }
.subtle-tag { color: var(--muted); background: var(--subtle); border-color: var(--line); }
.device-section { margin-top: 22px; padding: 20px; border: 1px solid var(--line); border-radius: 10px; }
.subsection-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; }
.subsection-heading h2, .density-setting h2 { color: var(--ink); font-size: 14px; font-weight: 600; margin: 0; }
.device-detail { display: flex; align-items: center; gap: 16px; }
.device-symbol { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 10px; background: var(--subtle); color: var(--muted); font-size: 25px; }
.device-detail strong { color: var(--ink); font-size: 13px; font-weight: 500; }
.device-detail p { color: var(--muted); font-size: 12px; line-height: 1.7; margin: 6px 0 0; }
.preference-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; line-height: 1.7; }
.preference-note > .anticon { margin-top: 4px; }
.mode-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; width: 100%; }
.mode-options :deep(.ant-radio-button-wrapper) { padding: 10px; height: auto; line-height: normal; border-inline-start-width: 1px; border-radius: 10px; }
.mode-options :deep(.ant-radio-button-wrapper > span:last-child) { display: block; }
.mode-preview { display: flex; gap: 8px; height: 104px; padding: 10px; border-radius: 6px; background: #f1f5f9; border: 1px solid #e2e8f0; }
.preview-sidebar { width: 22%; background: #dce4ef; border-radius: 3px; }
.preview-main { display: flex; flex: 1; flex-direction: column; gap: 7px; }
.preview-bar { height: 10px; background: #fff; border-radius: 3px; }
.preview-block { height: 29px; background: #fff; border-radius: 3px; }
.preview-lines { height: 16px; width: 72%; border-radius: 3px; background: #dce4ef; }
.mode-preview-dark { background: #181d28; border-color: #303849; }
.mode-preview-dark .preview-sidebar, .mode-preview-dark .preview-lines { background: #3c465b; }
.mode-preview-dark .preview-bar, .mode-preview-dark .preview-block { background: #293244; }
.mode-preview-system { background: linear-gradient(90deg, #f1f5f9 50%, #181d28 50%); }
.mode-preview-system .preview-bar, .mode-preview-system .preview-block { background: linear-gradient(90deg, #fff 26%, #293244 26%); }
.mode-preview-system .preview-lines { background: linear-gradient(90deg, #dce4ef 36%, #3c465b 36%); }
.mode-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; font-size: 13px; }
.mode-unselected { width: 13px; height: 13px; border: 1px solid var(--line); border-radius: 50%; }
.theme-color-field { margin-top: 28px; }
.density-setting { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-top: 1px solid var(--line); padding-top: 24px; }
.density-setting p { margin: 8px 0 0; color: var(--muted); font-size: 12px; line-height: 1.8; }
@media (min-width: 1001px) {
  .profile-center { align-items: stretch; }
  .profile-sidebar > .account-card { flex-shrink: 0; }
  .activity-card { display: flex; flex-direction: column; flex: 1; }
  .activity-card :deep(.ant-card-body) { display: flex; flex-direction: column; flex: 1; }
  .activity-link { margin-top: auto; }
}
@media (max-width: 1200px) { .profile-center { grid-template-columns: 244px minmax(0, 1fr); gap: 18px; } .profile-center .settings-tabs :deep(.ant-tabs-nav) { padding-inline: 22px; } .profile-center .settings-tabs :deep(.ant-tabs-content-holder) { padding: 24px 22px; } .settings-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) { margin-left: 24px; } .settings-tab { gap: 6px; font-size: 13px; } }
@media (max-width: 1000px) { .profile-center { grid-template-columns: minmax(0, 1fr); } .account-card :deep(.ant-card-body) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px 28px; } .account-identity { grid-row: span 3; justify-content: center; border-right: 1px solid var(--line); padding-right: 24px; } .account-card :deep(.ant-divider) { display: none; } .account-device { margin-top: 0; } .account-details :deep(.ant-descriptions-row > td) { padding-bottom: 10px; } }
@media (max-width: 600px) {
  .profile-center { gap: 16px; }
  .profile-sidebar { gap: 16px; }
  .account-card :deep(.ant-card-body) { display: block; padding: 24px 20px !important; }
  .account-identity { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 6px 14px; border-right: 0; padding-right: 0; text-align: left; }
  .account-avatar { grid-row: 1 / 4; width: 64px !important; height: 64px !important; line-height: 64px !important; margin: 0; font-size: 25px; }
  .account-identity h1 { font-size: 18px; margin: 0; }
  .account-identity > .ant-tag { justify-self: start; }
  .account-email { margin-top: 0; font-size: 11px; }
  .account-card :deep(.ant-divider) { display: block; margin: 20px 0; }
  .account-device { margin-top: 20px; }
  .profile-center .settings-tabs :deep(.ant-tabs-nav) { padding: 0 16px; }
  .profile-center .settings-tabs :deep(.ant-tabs-content-holder) { padding: 20px 16px; }
  .settings-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) { margin-left: 8px; }
  .settings-tabs :deep(.ant-tabs-tab) { padding: 17px 0; }
  .settings-tab { font-size: 12px; }
  .settings-tab :deep(.anticon) { display: none; }
  .avatar-editor { padding: 16px; gap: 14px; flex-wrap: wrap; }
  .avatar-controls p { font-size: 11px; }
  .color-options { gap: 8px 6px; }
  .color-options :deep(.ant-radio-button-wrapper) { padding-inline: 10px; }
  .settings-footer { align-items: stretch; }
  .settings-footer > .ant-space { margin-left: auto; }
  .settings-list :deep(.ant-list-item) { gap: 16px; flex-wrap: wrap; }
  .settings-list :deep(.ant-list-item-meta) { flex-basis: calc(100% - 60px); }
  .security-list :deep(.ant-list-item > .ant-btn), .security-list :deep(.ant-list-item > .ant-tag) { margin-left: 56px; }
  .settings-list :deep(.ant-list-item-meta-avatar) { margin-inline-end: 12px; }
  .setting-icon { width: 36px; height: 36px; font-size: 17px; }
  .device-section { padding: 16px; }
  .subsection-heading { flex-wrap: wrap; }
  .device-symbol { flex-shrink: 0; width: 38px; height: 38px; font-size: 22px; }
  .mode-options { gap: 8px; }
  .mode-options :deep(.ant-radio-button-wrapper) { padding: 6px; }
  .mode-preview { height: 68px; padding: 6px; gap: 4px; }
  .preview-main { gap: 5px; }
  .preview-block { height: 18px; }
  .mode-label { gap: 4px; font-size: 11px; margin-top: 10px; }
  .mode-label > .anticon, .mode-unselected { display: none; }
  .density-setting { gap: 16px; }
}
@media (max-width: 400px) {
  .settings-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) { margin-left: 4px; }
  .settings-tab { font-size: 11px; }
}
</style>
