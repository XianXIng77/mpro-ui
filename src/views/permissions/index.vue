<template>
  <workspace-page>
    <div class="permissions-page">
    <a-alert v-if="loadError" type="error" show-icon :message="loadError"><template #action><a-button :loading="loading" @click="refresh">重试</a-button></template></a-alert>
    <a-spin :spinning="loading">
    <a-card v-if="!loadError" class="workspace-card permissions-card" :body-style="{ padding: 0 }">
      <div class="access-overview" aria-label="权限概览">
        <div class="overview-item">
          <span class="overview-icon"><SafetyCertificateOutlined aria-hidden="true" /></span>
          <a-statistic title="权限角色" :value="workspace.roles.length" suffix="类" />
        </div>
        <div class="overview-item">
          <span class="overview-icon"><TeamOutlined aria-hidden="true" /></span>
          <a-statistic title="工作台成员" :value="workspace.users.length" suffix="位" />
        </div>
        <div class="overview-item">
          <span class="overview-icon"><LinkOutlined aria-hidden="true" /></span>
          <a-statistic title="个人授权调整" :value="overrideCount" suffix="位成员" />
        </div>
      </div>

      <a-tabs class="access-tabs" :active-key="activeView" @change="changeView">
        <template #rightExtra>
          <a-tooltip title="刷新">
            <a-button type="text" :loading="loading" aria-label="刷新权限数据" @click="refresh">
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </a-tooltip>
        </template>
        <a-tab-pane key="roles">
          <template #tab><span class="tab-label"><SafetyCertificateOutlined />角色管理</span></template>
          <section aria-labelledby="roles-title">
            <div class="role-grid">
              <a-card v-for="role in workspace.roles" :key="role.key" class="role-card" :body-style="{ padding: '22px' }">
                <div class="role-card-heading">
                  <a-avatar :size="44" shape="square" class="role-avatar" :class="'role-avatar-' + role.key">
                    <template #icon><CrownOutlined v-if="role.key === 'owner'" /><SafetyCertificateOutlined v-else-if="role.key === 'admin'" /><UserOutlined v-else /></template>
                  </a-avatar>
                  <div class="role-title"><h3>{{ role.label }}</h3><span>{{ role.key.toUpperCase() }}</span></div>
                  <a-tag class="quiet-tag">{{ role.key === 'owner' ? '全部权限' : '可配置' }}</a-tag>
                </div>
                <p class="role-description">{{ role.description }}</p>
                <div class="role-metrics">
                  <div><strong>{{ role.permissions.length }}</strong><span>操作权限</span></div>
                  <div><a-button type="link" :aria-label="'查看' + role.label + '成员'" @click="showRoleMembers(role.key)">{{ roleCount(role.key) }}</a-button><span>使用成员</span></div>
                </div>
                <div class="role-scope">
                  <h4>涉及功能模块</h4>
                  <a-space v-if="roleModules(role).length" wrap :size="[6, 8]">
                    <a-tag v-for="menu in roleModules(role)" :key="menu.key" class="scope-tag">{{ menu.label }}</a-tag>
                  </a-space>
                  <span v-else class="muted">暂未授予操作权限</span>
                </div>
                <a-button block :type="canManageRole(role) ? 'primary' : 'default'" :ghost="canManageRole(role)" class="role-action" :aria-label="role.label + '权限'" @click="openRole(role)">
                  {{ canManageRole(role) ? '配置权限' : '查看权限' }}<RightOutlined aria-hidden="true" />
                </a-button>
              </a-card>
            </div>
            <div class="directory-footnote"><InfoCircleOutlined aria-hidden="true" /><span>修改角色权限会同步影响该角色下的成员，个人授权调整将单独保留。</span></div>
          </section>
        </a-tab-pane>

        <a-tab-pane key="users">
          <template #tab><span class="tab-label"><TeamOutlined />成员授权</span></template>
          <section aria-labelledby="members-title">
            <div class="member-filters">
              <a-input :value="userQuery" aria-label="搜索成员" placeholder="搜索成员姓名或邮箱" allow-clear @update:value="setUserQuery">
                <template #prefix><SearchOutlined class="muted" /></template>
              </a-input>
              <a-select :value="roleFilter" :options="filterOptions" aria-label="筛选角色" @change="setRoleFilter" />
              <a-button v-if="userQuery || roleFilter" type="link" @click="resetFilters">重置筛选</a-button>
              <span class="filter-count">共 {{ filteredUsers.length }} 位成员</span>
            </div>
            <a-table class="members-table" :columns="memberColumns" :data-source="filteredUsers" row-key="email" :scroll="{ x: 1080 }" :pagination="memberPagination" :locale="{ emptyText: '没有匹配的成员，请调整搜索条件' }" @change="onMemberTableChange">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'member'">
                  <div class="member-identity">
                    <a-avatar :size="38">{{ record.username.slice(0, 1) }}</a-avatar>
                    <h3>{{ record.username }}</h3>
                  </div>
                </template>
                <a-typography-text v-else-if="column.key === 'email'" class="member-email" :ellipsis="{ tooltip: record.email }">{{ record.email }}</a-typography-text>
                <a-tag v-else-if="column.key === 'role'" :color="record.role === 'owner' ? 'gold' : record.role === 'admin' ? 'blue' : undefined">{{ roleLabel(record.role) }}</a-tag>
                <span v-else-if="column.key === 'permissions'" class="member-scope"><strong>{{ record.permissions.length }}</strong><span class="muted"> 项</span></span>
                <template v-else-if="column.key === 'extra'">
                  <a-tooltip v-if="record.extraPermissions.length" :title="'操作权限 ' + record.extraPermissions.length + ' 项'">
                    <a-tag color="blue">+{{ record.extraPermissions.length }} 项</a-tag>
                  </a-tooltip>
                  <span v-else class="muted">无</span>
                </template>
                <template v-else-if="column.key === 'removed'">
                  <a-tooltip v-if="record.removedPermissions.length" :title="'操作权限 ' + record.removedPermissions.length + ' 项'">
                    <a-tag color="orange">−{{ record.removedPermissions.length }} 项</a-tag>
                  </a-tooltip>
                  <span v-else class="muted">无</span>
                </template>
                <a-badge v-else-if="column.key === 'source'" :status="hasOverrides(record) ? 'processing' : 'default'" :text="hasOverrides(record) ? '个人调整' : '继承角色'" />
                <a-button v-else-if="column.key === 'action'" type="link" :aria-label="'管理' + record.username + '权限'" @click="openUser(record)">管理授权<RightOutlined aria-hidden="true" /></a-button>
              </template>
            </a-table>
          </section>
        </a-tab-pane>

        <a-tab-pane key="public">
          <template #tab><span class="tab-label"><LinkOutlined />访问策略</span></template>
          <section class="policy-list" aria-labelledby="public-policy-title">
            <div class="policy-row">
              <span class="policy-icon"><LinkOutlined /></span>
              <div class="policy-copy"><h3 id="public-policy-title">收件箱免登录访问</h3><p>AI 注册账号管理中的「收信」会在新标签页打开收件箱。开启后，访问者无需登录即可查看邮件；关闭后，必须登录才能查看，收件箱地址不变。</p><a-typography-text type="secondary">修改后，下次收件箱请求立即按新设置校验。</a-typography-text></div>
              <a-switch :checked="workspace.publicMailEnabled" :loading="policySaving" :disabled="!canManageAccess" checked-children="开启" un-checked-children="关闭" aria-label="收件箱免登录访问开关" @change="togglePublicMail" />
            </div>
            <a-alert v-if="!canManageAccess" type="info" show-icon message="当前账号只能查看访问策略" />
          </section>
        </a-tab-pane>
      </a-tabs>
    </a-card>
    </a-spin>
    <a-drawer :open="editorOpen" :title="editorKind === 'roles' ? '角色权限' : '成员授权'" width="min(440px, 100vw)" :content-wrapper-style="{ maxWidth: '100vw' }" :body-style="{ padding: '24px' }" destroy-on-close @close="closeEditor">
      <a-typography class="authorization-editor">
        <div class="drawer-identity">
          <a-avatar :size="48" :shape="editorKind === 'roles' ? 'square' : 'circle'" :class="editorKind === 'roles' ? ['role-avatar', 'role-avatar-' + roleDraft.key] : []">
            <template #icon>
              <template v-if="editorKind === 'roles'">
                <CrownOutlined v-if="roleDraft.key === 'owner'" aria-hidden="true" />
                <SafetyCertificateOutlined v-else-if="roleDraft.key === 'admin'" aria-hidden="true" />
                <UserOutlined v-else aria-hidden="true" />
              </template>
              <span v-else>{{ userDraft.username.slice(0, 1) }}</span>
            </template>
          </a-avatar>
          <div>
            <h2>{{ editorKind === 'roles' ? roleDraft.label : userDraft.username }}</h2>
            <a-typography-text type="secondary">{{ editorKind === 'roles' ? roleCount(roleDraft.key) + ' 位成员使用此角色' : userDraft.email }}</a-typography-text>
          </div>
          <a-tag v-if="!editorCanEdit">只读</a-tag>
          <a-tag v-else-if="editorDirty" color="warning">待保存</a-tag>
        </div>
        <a-typography-paragraph v-if="editorKind === 'roles'" type="secondary" class="editor-description">{{ roleDraft.description }}</a-typography-paragraph>
        <div v-else class="base-role-field"><label for="member-role">基础角色</label><a-select id="member-role" v-model:value="userDraft.role" :options="roleOptions" :disabled="!canChangeRole || saving" /><a-typography-paragraph type="secondary">标注“继承”的权限来自基础角色，取消勾选仅影响当前成员。</a-typography-paragraph></div>
        <a-alert v-if="!editorCanEdit" class="editor-note" type="info" show-icon :message="editorKind === 'roles' ? roleDraft.key === 'owner' ? '站主拥有全部权限，角色模板不可修改。' : '只有站主可以修改角色基础权限。' : userDraft.role === 'owner' ? '站主拥有全部权限，个人授权不可修改。' : '只有站主可以修改管理员的个人授权。'" />
        <a-divider />
        <access-grant-editor :key="editorKind + (editorKind === 'roles' ? roleDraft.key : userDraft.email)" :permission-codes="editorKind === 'roles' ? roleDraft.permissions : effectivePermissions" :inherited-permissions="editorKind === 'users' ? inheritedPermissions : []" :disabled="!editorCanEdit || saving" :allow-management="(editorKind === 'roles' ? roleDraft.key : userDraft.role) !== 'user'" @toggle-permission="toggleGrant" />
        <template v-if="editorKind === 'users' && isOwner && userDraft.role === 'admin'"><a-divider /><div class="ownership-setting"><div><h3>站主身份</h3><a-typography-text type="secondary">转移后，当前账号将变为管理员。</a-typography-text></div><a-popconfirm title="确定将站主身份转移给该成员？" ok-text="确认转移" cancel-text="取消" @confirm="transferOwner"><a-button danger :disabled="saving || userDirty">转移站主</a-button></a-popconfirm></div></template>
      </a-typography>
      <template #footer><a-typography class="editor-footer"><a-typography-text type="secondary">{{ editorDirty ? '有尚未保存的修改' : editorCanEdit ? '修改后点击保存生效' : '当前授权仅可查看' }}</a-typography-text><a-space><a-button v-if="editorCanEdit" :disabled="!editorDirty || saving" @click="resetDrafts">撤销修改</a-button><a-button v-if="editorCanEdit" type="primary" :loading="saving" :disabled="!editorDirty" @click="saveAuthorization">保存授权</a-button><a-button v-else @click="closeEditor">关闭</a-button></a-space></a-typography></template>
    </a-drawer>
    </div>
  </workspace-page>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { Alert, Avatar, Badge, Button, Card, Divider, Drawer, Input, Modal, Popconfirm, Select, Space, Spin, Statistic, Switch, Table, Tabs, Tag, Tooltip, Typography, message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue/es/table/interface'
import { CrownOutlined, InfoCircleOutlined, LinkOutlined, ReloadOutlined, RightOutlined, SafetyCertificateOutlined, SearchOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons-vue'
import WorkspacePage from '@/components/WorkspacePage.vue'
import AccessGrantEditor from '@/components/AccessGrantEditor.vue'
import { PERMISSION_MODULES } from '@/constants/access'
import { accessApi, AccessMember, AccessOverview } from '@/api/access'
import { accessState, hasPermission, loadAccess } from '@/utils/access'
import { getAuthorization } from '@/utils/auth-token'
import { resolvePermissions, toggleUserPermission } from '@/utils/access-grants'
import type { PermissionModule, AccessRole, AccessUser } from '@/types/workspace'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
export default defineComponent({
  name: 'PermissionsPage',
  components: { WorkspacePage, AccessGrantEditor, AAlert: Alert, AAvatar: Avatar, ABadge: Badge, AButton: Button, ACard: Card, ADivider: Divider, ADrawer: Drawer, AInput: Input, APopconfirm: Popconfirm, ASelect: Select, ASpace: Space, AStatistic: Statistic, ASpin: Spin, ASwitch: Switch, ATable: Table, ATabs: Tabs, ATabPane: Tabs.TabPane, ATag: Tag, ATooltip: Tooltip, ATypography: Typography, ATypographyText: Typography.Text, ATypographyParagraph: Typography.Paragraph, CrownOutlined, InfoCircleOutlined, LinkOutlined, ReloadOutlined, RightOutlined, SafetyCertificateOutlined, SearchOutlined, TeamOutlined, UserOutlined },
  data() {
    return {
      workspace: { roles: [], users: [], publicMailEnabled: true } as AccessOverview,
      accessState, loadError: '', requestId: 0,
      activeView: 'roles',
      editorOpen: false,
      editorKind: 'roles',
      roleDraft: { key: '', label: '', description: '', permissions: [] } as AccessRole,
      userDraft: { userId: 0, email: '', username: '', role: 'user', extraPermissions: [], removedPermissions: [], permissions: [] } as AccessMember,
      userQuery: '',
      roleFilter: '',
      memberPage: 1,
      memberPageSize: 10,
      saving: false,
      policySaving: false,
      loading: false,
      memberColumns: [
        { title: '成员', key: 'member', width: 150, align: 'center' as const },
        { title: '邮箱账号', key: 'email', width: 200, align: 'center' as const },
        { title: '基础角色', key: 'role', width: 90, align: 'center' as const },
        { title: '操作权限', key: 'permissions', width: 90, align: 'center' as const },
        { title: '个人新增', key: 'extra', width: 110, align: 'center' as const },
        { title: '个人撤销', key: 'removed', width: 110, align: 'center' as const },
        { title: '授权方式', key: 'source', width: 110, align: 'center' as const },
        { title: '操作', key: 'action', width: 130, align: 'center' as const, fixed: 'right' as const }
      ]
    }
  },
  computed: {
    overrideCount(): number { return this.workspace.users.filter(this.hasOverrides).length },
    memberPagination(): TablePaginationConfig {
      return {
        current: this.memberPage,
        pageSize: this.memberPageSize,
        total: this.filteredUsers.length,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showQuickJumper: true,
        hideOnSinglePage: false,
        responsive: true,
        showTotal: (total, range) => total ? `第 ${range[0]}–${range[1]} 条，共 ${total} 位成员` : '共 0 位成员'
      }
    },
    actor(): AccessMember | undefined { return this.workspace.users.find(user => user.userId === this.accessState.snapshot?.userId) },
    isOwner(): boolean { return this.accessState.snapshot?.role === 'owner' },
    roleCanEdit(): boolean { return this.canManageRole(this.roleDraft) },
    userCanEdit(): boolean { return hasPermission('access:manage') && this.userDraft.userId !== this.actor?.userId && this.userDraft.role !== 'owner' && (this.isOwner || this.accessState.snapshot?.role === 'admin' && this.userDraft.role === 'user') },
    canChangeRole(): boolean { return this.isOwner && this.workspace.users.find(user => user.userId === this.userDraft.userId)?.role === 'user' },
    canManageAccess(): boolean { return hasPermission('access:manage') },
    roleDirty(): boolean { return JSON.stringify(this.roleDraft) !== JSON.stringify(this.workspace.roles.find(role => role.key === this.roleDraft.key)) },
    userDirty(): boolean { return JSON.stringify(this.userDraft) !== JSON.stringify(this.workspace.users.find(user => user.email === this.userDraft.email)) },
    editorDirty(): boolean { return this.editorOpen && (this.editorKind === 'roles' ? this.roleDirty : this.userDirty) },
    editorCanEdit(): boolean { return this.editorKind === 'roles' ? this.roleCanEdit : this.userCanEdit },
    filteredUsers(): AccessMember[] { const query = this.userQuery.trim().toLowerCase(); return this.workspace.users.filter(user => (!this.roleFilter || user.role === this.roleFilter) && (user.username + ' ' + user.email).toLowerCase().includes(query)) },
    userRole(): AccessRole | undefined { return this.workspace.roles.find(role => role.key === this.userDraft.role) },
    effectivePermissions(): string[] { return resolvePermissions(this.userDraft, this.userRole) },
    inheritedPermissions(): string[] { return (this.userRole?.permissions || []).filter(value => this.effectivePermissions.includes(value) && !this.userDraft.extraPermissions.includes(value)) },
    roleOptions(): Array<{ value: string; label: string }> { return this.workspace.roles.filter(role => this.canChangeRole ? role.key !== 'owner' : role.key === this.userDraft.role).map(role => ({ value: role.key, label: role.label })) },
    filterOptions(): Array<{ value: string; label: string }> { return [{ value: '', label: '全部角色' }, ...this.workspace.roles.map(role => ({ value: role.key, label: role.label }))] }
  },
  watch: {
    filteredUsers(users: AccessUser[]) {
      const lastPage = Math.max(1, Math.ceil(users.length / this.memberPageSize))
      this.memberPage = Math.min(this.memberPage, lastPage)
    }
  },
  mounted() { this.loadOverview() },
  beforeUnmount() { this.requestId++ },
  async beforeRouteLeave(): Promise<boolean> {
    if (!getAuthorization()) return true
    return this.saving ? false : this.confirmDiscard()
  },
  methods: {
    canManageRole(role: AccessRole): boolean { return hasPermission('access:manage') && this.isOwner && role.key !== 'owner' },
    roleLabel(key: string): string { return this.workspace.roles.find(role => role.key === key)?.label || key },
    roleCount(key: string): number { return this.workspace.users.filter(user => user.role === key).length },
    roleModules(role: AccessRole): PermissionModule[] { return PERMISSION_MODULES.filter(module => role.permissions.some(code => code.startsWith(module.key + ':'))) },
    hasOverrides(user: AccessUser): boolean { return !!(user.extraPermissions.length || user.removedPermissions.length) },
    confirmDiscard(): Promise<boolean> { if (!this.editorDirty) return Promise.resolve(true); return new Promise(resolve => Modal.confirm({ title: '有尚未保存的授权修改', content: '关闭后将放弃本次修改。', okText: '放弃修改', cancelText: '继续编辑', onOk: () => resolve(true), onCancel: () => resolve(false) })) },
    resetDrafts() { const role = this.workspace.roles.find(item => item.key === this.roleDraft.key); const user = this.workspace.users.find(item => item.email === this.userDraft.email); if (role) this.roleDraft = clone(role); if (user) this.userDraft = clone(user) },
    async changeView(view: string) { if (this.saving || this.loading || !await this.confirmDiscard()) return; this.editorOpen = false; this.resetDrafts(); this.activeView = view },
    showRoleMembers(key: string) { this.activeView = 'users'; this.roleFilter = key; this.userQuery = ''; this.memberPage = 1 },
    setUserQuery(value: string) { this.userQuery = value; this.memberPage = 1 },
    setRoleFilter(value: string) { this.roleFilter = value; this.memberPage = 1 },
    onMemberTableChange(pagination: TablePaginationConfig) {
      const pageSize = pagination.pageSize || this.memberPageSize
      this.memberPage = pageSize === this.memberPageSize ? pagination.current || 1 : 1
      this.memberPageSize = pageSize
    },
    resetFilters() { this.userQuery = ''; this.roleFilter = ''; this.memberPage = 1 },
    openRole(role: AccessRole) { if (this.loading) return; this.resetDrafts(); this.roleDraft = clone(role); this.editorKind = 'roles'; this.editorOpen = true },
    openUser(user: AccessMember) { if (this.loading) return; this.resetDrafts(); this.userDraft = clone(user); this.editorKind = 'users'; this.editorOpen = true },
    async closeEditor() { if (this.saving || !await this.confirmDiscard()) return; this.editorOpen = false; this.resetDrafts() },
    toggleGrant(code: string) {
      if (!this.editorCanEdit || this.saving) return
      if (this.editorKind === 'users') {
        Object.assign(this.userDraft, toggleUserPermission(this.userDraft, this.userRole, code))
      } else {
        const values = this.roleDraft.permissions
        this.roleDraft.permissions = values.includes(code) ? values.filter(value => value !== code) : [...values, code]
      }
    },
    async saveAuthorization() {
      if (!this.editorCanEdit || this.saving || !this.editorDirty) return
      this.saving = true
      try {
        if (this.editorKind === 'roles') await accessApi.updateRole(this.roleDraft)
        else await accessApi.updateUser(this.userDraft)
        this.editorOpen = false
        message.success('授权已保存')
        await loadAccess(true)
        await this.loadOverview()
      } catch (error) { message.error(this.errorText(error)) }
      finally { this.saving = false }
    },

    async togglePublicMail(enabled: boolean) {
      if (!this.canManageAccess || this.policySaving) return
      const previous = this.workspace.publicMailEnabled
      this.workspace.publicMailEnabled = enabled
      this.policySaving = true
      try {
        await accessApi.updatePublicMailPolicy(enabled)
        message.success(enabled ? '收件箱免登录访问已开启' : '收件箱已设为登录后访问')
      } catch (error) {
        this.workspace.publicMailEnabled = previous
        message.error(this.errorText(error))
      } finally { this.policySaving = false }
    },

    async transferOwner() {
      if (!this.isOwner || this.userDraft.role !== 'admin' || this.saving || this.userDirty) return
      this.saving = true
      try {
        await accessApi.transferOwner(this.userDraft.userId)
        this.editorOpen = false
        message.success('站主已转移，当前账号已变为管理员')
        await loadAccess(true)
        await this.loadOverview()
      } catch (error) { message.error(this.errorText(error)) }
      finally { this.saving = false }
    },
    async refresh() {
      if (this.loading || this.saving || !await this.confirmDiscard()) return
      this.editorOpen = false
      try { await loadAccess(true); await this.loadOverview() }
      catch (error) { this.loadError = this.errorText(error) }
    },
    async loadOverview() {
      const id = ++this.requestId
      this.loading = true
      this.loadError = ''
      try {
        const overview = await accessApi.overview()
        if (id !== this.requestId) return
        this.workspace = { ...overview, publicMailEnabled: overview.publicMailEnabled !== false }
        this.resetDrafts()
      } catch (error) { if (id === this.requestId) this.loadError = this.errorText(error) }
      finally { if (id === this.requestId) this.loading = false }
    },
    errorText(error: unknown): string { return error instanceof Error ? error.message : '操作失败，请稍后重试' }
  }
})
</script>
<style scoped>
.permissions-card { box-shadow: 0 3px 14px rgb(15 23 42 / 3%); }
.access-overview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 26px 28px; border-bottom: 1px solid var(--line); }
.overview-item { display: flex; align-items: center; gap: 16px; padding: 0 28px; border-right: 1px solid var(--line); }
.overview-item:first-child { padding-left: 0; }
.overview-item:last-child { border-right: 0; }
.overview-icon { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; background: var(--subtle); border: 1px solid var(--line); border-radius: 12px; color: var(--muted); font-size: 21px; }
.access-overview :deep(.ant-statistic-title) { color: var(--muted); font-size: 12px; margin-bottom: 3px; }
.access-overview :deep(.ant-statistic-content) { color: var(--ink); font-size: 26px; font-weight: 600; line-height: 1.25; }
.access-overview :deep(.ant-statistic-content-suffix) { color: var(--muted); font-size: 12px; font-weight: 400; margin-left: 8px; }
.permissions-page .access-tabs :deep(.ant-tabs-nav) { padding: 0 28px; }
.permissions-page .access-tabs :deep(.ant-tabs-content-holder) { padding: 26px 28px; }
.access-tabs :deep(.ant-tabs-tab) { padding: 18px 0; }
.tab-label { display: inline-flex; align-items: center; gap: 8px; }
.tab-label :deep(.anticon) { margin-right: 0; }
.section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 24px; }
.section-heading h2 { color: var(--ink); font-size: 17px; font-weight: 600; margin: 0 0 8px; }
.section-heading p { color: var(--muted); font-size: 13px; line-height: 1.7; margin: 0; }
.quiet-tag { color: var(--muted); border: 1px solid var(--line); background: var(--subtle); white-space: nowrap; }
.role-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.role-card { min-width: 0; border-color: var(--line); border-radius: 12px; background: var(--surface); }
.role-card :deep(.ant-card-body) { display: flex; flex-direction: column; height: 100%; }
.role-card-heading { display: flex; align-items: center; gap: 12px; }
.role-avatar { flex-shrink: 0; color: #536882; background: #edf2f8; border-radius: 10px; }
.role-avatar-owner { color: #9b742d; background: #faf3e5; }
.role-avatar-admin { color: #3464d6; background: #edf3ff; }
.role-title { min-width: 0; flex: 1; }
.role-title h3 { margin: 0 0 2px; color: var(--ink); font-size: 16px; font-weight: 600; }
.role-title > span { color: var(--muted); font-size: 10px; letter-spacing: 1px; }
.role-card-heading > .ant-tag { font-size: 11px; padding-inline: 6px; }
.role-description { min-height: 44px; margin: 18px 0; color: var(--muted); font-size: 12px; line-height: 1.85; }
.role-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 16px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.role-metrics > div { display: flex; flex-direction: column; align-items: center; gap: 4px; border-right: 1px solid var(--line); }
.role-metrics > div:last-child { border-right: 0; }
.role-metrics strong, .role-metrics .ant-btn { height: 28px; padding: 0 8px; font-size: 22px; line-height: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
.role-metrics strong { color: var(--ink); }
.role-metrics span { color: var(--muted); font-size: 12px; }
.role-scope { flex: 1; padding: 20px 0 24px; }
.role-scope h4 { color: var(--muted); font-size: 12px; font-weight: 500; margin: 0 0 12px; }
.scope-tag { padding: 2px 8px; color: var(--muted); background: var(--subtle); border-color: transparent; font-size: 12px; }
.role-action { height: 36px; }
.directory-footnote { display: flex; align-items: flex-start; gap: 8px; margin-top: 22px; color: var(--muted); font-size: 12px; line-height: 1.8; }
.directory-footnote .anticon { margin-top: 4px; }
.member-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 16px; margin-bottom: 20px; border-radius: 8px; background: var(--subtle); }
.member-filters > .ant-input-affix-wrapper { width: 270px; }
.member-filters > .ant-select { width: 150px; }
.filter-count { color: var(--muted); font-size: 12px; margin-left: auto; }
.members-table { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.permissions-page .members-table :deep(.ant-table-thead > tr > th) { text-align: center; font-size: 12px; }
.members-table :deep(.ant-table-tbody > tr > td) { padding-block: 20px; }
.member-identity { display: flex; align-items: center; justify-content: center; gap: 10px; min-width: 0; text-align: center; }
.member-identity > .ant-avatar { flex-shrink: 0; color: var(--muted); background: var(--subtle); border: 1px solid var(--line); }
.member-identity h3 { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 0; color: var(--ink); font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
.member-email { max-width: 100%; font-size: 12px; }
.member-scope { color: var(--ink); font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.member-scope strong { font-size: 14px; font-weight: 600; }
.policy-notice { margin-bottom: 20px; }
.policy-list { border: 1px solid var(--line); border-radius: 10px; padding: 0 24px; }
.policy-list :deep(.ant-list-item) { padding: 26px 0; }
.policy-row { display: flex; align-items: flex-start; width: 100%; gap: 18px; }
.policy-icon { flex-shrink: 0; color: var(--muted); background: var(--subtle); }
.policy-copy { flex: 1; }
.policy-copy h3 { color: var(--ink); font-size: 14px; font-weight: 600; margin: 0 0 8px; }
.policy-copy p { color: var(--muted); font-size: 13px; margin: 0 0 12px; line-height: 1.8; }
.policy-row > .ant-switch { margin-top: 6px; }
.authorization-editor { margin: 0; }
.authorization-editor :deep(.ant-typography-secondary), .editor-footer :deep(.ant-typography-secondary) { color: inherit; opacity: .8; }
.drawer-identity { display: flex; align-items: center; gap: 14px; }
.drawer-identity > div { min-width: 0; }
.drawer-identity h2 { color: inherit; font-size: 20px; margin: 0 0 5px; }
.drawer-identity :deep(.ant-avatar) { flex-shrink: 0; }
.drawer-identity :deep(.ant-typography) { font-size: 13px; overflow-wrap: anywhere; }
.drawer-identity > .ant-tag { margin-left: auto; }
.editor-description { margin: 18px 0 0; font-size: 13px; line-height: 1.8; }
.editor-note { margin-top: 20px; }
.base-role-field { margin-top: 24px; }
.base-role-field label { display: block; font-size: 13px; margin-bottom: 8px; }
.base-role-field :deep(.ant-select) { width: 100%; }
.base-role-field :deep(.ant-typography) { margin: 12px 0 0; font-size: 12px; }
.editor-footer { margin: 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 6px 0; }
.editor-footer > :first-child { font-size: 12px; }
.ownership-setting { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; }
.ownership-setting h3 { color: inherit; font-size: 14px; margin: 0 0 8px; }
.ownership-setting :deep(.ant-typography) { font-size: 12px; }
@media (max-width: 1250px) { .role-grid { gap: 12px; } .role-card :deep(.ant-card-body) { padding: 18px !important; } .role-card-heading { flex-wrap: wrap; } .role-card-heading > .ant-tag { margin-left: 56px; } .overview-item { padding-inline: 20px; } }
@media (max-width: 1000px) { .role-grid { grid-template-columns: 1fr; } .role-card-heading > .ant-tag { margin-left: 0; } .role-description { min-height: 0; } .role-metrics { max-width: 400px; } .role-scope { padding-bottom: 20px; } .overview-icon { display: none; } }
@media (max-width: 600px) {
  .access-overview { padding: 20px 16px; }
  .overview-item { padding: 0 12px; }
  .overview-item:last-child { padding-right: 0; }
  .access-overview :deep(.ant-statistic-title) { font-size: 11px; }
  .access-overview :deep(.ant-statistic-content) { font-size: 23px; }
  .permissions-page .access-tabs :deep(.ant-tabs-nav) { padding: 0 16px; }
  .permissions-page .access-tabs :deep(.ant-tabs-content-holder) { padding: 20px 16px; }
  .access-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) { margin-left: 20px; }
  .tab-label { gap: 6px; font-size: 13px; }
  .tab-label :deep(.anticon) { display: none; }
  .section-heading { gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .section-heading p { font-size: 12px; }
  .section-heading > .ant-tag { font-size: 11px; }
  .member-filters { padding: 12px; }
  .member-filters > .ant-input-affix-wrapper { width: 100%; }
  .member-filters > .ant-select { flex: 1; width: auto; min-width: 120px; }
  .filter-count { width: 100%; margin-left: 0; }
  .policy-list { padding: 0 16px; }
  .policy-row { gap: 12px; }
  .policy-icon { display: none; }
  .editor-footer { align-items: stretch; }
  .editor-footer > :last-child { margin-left: auto; }
}
</style>
