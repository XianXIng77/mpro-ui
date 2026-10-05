<template>
  <div class="mail-page">
    <a-card class="mail-card" :body-style="{ padding: 0 }">
      <div class="mail-toolbar">
        <a-space :size="8" wrap>
          <a-button v-if="hasPermission('email:create')" @click="openImport"><template #icon><PlusOutlined /></template>新增</a-button>
          <a-button href="https://wmemail.com/products/outlookbm" target="_blank" rel="noopener noreferrer">
            <template #icon><ShoppingCartOutlined /></template>购买邮箱
          </a-button>
          <a-button v-if="hasPermission('email:refresh')" :loading="batchRefreshing" @click="refreshSelected">
            <template #icon><SyncOutlined /></template>批量刷新 Token
          </a-button>
          <a-button @click="copySelected">
            <template #icon><CopyOutlined /></template>获取选中账号
          </a-button>
          <a-button v-if="hasPermission('email:delete')" danger @click="confirmDeleteSelected">
            <template #icon><DeleteOutlined /></template>删除选中
          </a-button>
        </a-space>

        <a-space :size="8" class="toolbar-end">
          <a-input-search
            :value="searchText"
            class="mail-search"
            allow-clear
            placeholder="输入邮箱关键词"
            @change="onSearchTextChange"
            @search="searchAccounts"
          />
          <a-tooltip title="刷新列表">
            <a-button :loading="loading" aria-label="刷新列表" @click="searchAccounts()">
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </a-tooltip>
        </a-space>
      </div>

      <a-alert
        v-if="listError"
        class="mail-error"
        type="error"
        show-icon
        :message="listError"
      />

      <a-alert
        v-if="importSummary"
        class="import-summary"
        :type="importSummary.failed ? 'warning' : 'success'"
        show-icon
        closable
        :message="'导入完成：新增 ' + importSummary.added + '，跳过 ' + importSummary.skipped + '，失败 ' + importSummary.failed"
        @close="importResults = null"
      >
        <template v-if="failedImportResults.length" #description>
          <div v-for="record in failedImportResults" :key="record.lineNo">
            第 {{ record.lineNo }} 行{{ record.email ? '（' + record.email + '）' : '' }}：{{ record.message }}
          </div>
        </template>
      </a-alert>

      <a-table
        row-key="accountId"
        :columns="columns"
        :data-source="accountRows"
        :loading="loading"
        :row-selection="rowSelection"
        :pagination="pagination"
        :scroll="{ x: 1300 }"
        :locale="{ emptyText: listError ? '列表加载失败' : '暂无邮箱账号' }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'email'">
            <a-tooltip title="点击复制邮箱地址"><a-button type="link" size="small" @click="copyAddress(record.email)">{{ record.email }}</a-button></a-tooltip>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ record.createTime || '—' }}
          </template>
          <template v-else-if="column.key === 'lastRefreshTime'">
            {{ record.lastRefreshTime }}
          </template>
          <template v-else-if="column.key === 'tokenExpiry'">
            <a-tag :color="record.tokenExpiry.color" class="token-expiry-tag">{{ record.tokenExpiry.text }}</a-tag>
          </template>
          <template v-else-if="column.key === 'refreshResult'">
            <a-tag v-if="refreshResults[record.accountId]" :color="refreshResults[record.accountId].color">
              {{ refreshResults[record.accountId].text }}
            </a-tag>
            <span v-else class="muted-text">未刷新</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="0" class="row-actions">
              <a-button v-if="hasPermission('email:messages')" type="link" size="small" :loading="inboxLoading && activeAccount?.accountId === record.accountId" @click="openInbox(record)">
                <template #icon><MailOutlined /></template>收信
              </a-button>
              <a-tooltip title="复制邮箱地址">
                <a-button type="link" size="small" @click="copyAddress(record.email)">
                  <template #icon><CopyOutlined /></template>获取
                </a-button>
              </a-tooltip>
              <a-button v-if="hasPermission('email:refresh')"
                type="link"
                size="small"
                :loading="!!refreshRequests[record.accountId]"
                @click="refreshAccount(record)"
              >
                <template #icon><SyncOutlined /></template>刷新
              </a-button>
              <a-popconfirm v-if="hasPermission('email:delete')"
                title="确定删除这个邮箱账号吗？"
                ok-text="删除"
                cancel-text="取消"
                @confirm="deleteAccount(record)"
              >
                <a-button type="link" danger size="small">
                  <template #icon><DeleteOutlined /></template>删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal v-if="hasPermission('email:create')" :open="importOpen" title="新增 Outlook 邮箱账号" :width="620"
      :confirm-loading="importing" ok-text="确认导入" @ok="importAccounts" @cancel="importOpen = false">
      <a-form layout="vertical">
        <a-form-item label="邮箱账号文本" extra="每行格式：邮箱----x----refresh_token----client_id">
          <a-textarea :value="importText" :rows="10" @input="onImportTextInput"
            placeholder="请粘贴邮箱账号，每行一个" class="import-textarea" />
        </a-form-item>
        <a-alert type="info" show-icon message="重复邮箱会自动跳过；粘贴内容不能超过 5MB。" />
      </a-form>
    </a-modal>

    <a-drawer
      :open="inboxOpen"
      @close="inboxOpen = false"
      :title="activeAccount ? activeAccount.email : '收件箱'"
      width="min(440px, 100vw)"
      placement="right"
    >
      <template #extra>
        <a-select :value="inboxTop" :options="inboxTopOptions" :disabled="inboxLoading" class="inbox-top-select"
          aria-label="邮件数量" @change="changeInboxTop" />
      </template>
      <a-alert v-if="inboxError" type="error" show-icon :message="inboxError" class="drawer-alert" />
      <a-alert v-if="inboxHasMore" type="info" show-icon
        :message="'当前显示最近 ' + inboxTop + ' 封邮件，后面还有更多邮件'" class="drawer-alert" />
      <div v-if="inboxLoading" class="inbox-loading"><a-spin /></div>
      <a-list v-else :data-source="emails" :locale="{ emptyText: '暂无邮件' }">
        <template #renderItem="{ item }">
          <a-list-item class="email-item" :role="hasPermission('email:detail') ? 'button' : undefined" :tabindex="hasPermission('email:detail') ? 0 : undefined" @click="openEmail(item)" @keydown.enter="openEmail(item)" @keydown.space.prevent="openEmail(item)">
            <a-list-item-meta :description="item.from?.emailAddress?.address || '未知发件人'">
              <template #title>{{ item.subject || '（无主题）' }}</template>
            </a-list-item-meta>
            <div class="email-time">{{ formatDate(item.receivedDateTime) }}</div>
          </a-list-item>
        </template>
      </a-list>
    </a-drawer>

    <a-modal v-if="hasPermission('email:detail')"
      v-model:open="emailOpen"
      :title="emailDetail?.subject || '邮件详情'"
      :footer="null"
      :width="860"
      centered
      :body-style="{ height: 'min(74vh, 760px)', overflow: 'hidden' }"
    >
      <div class="email-detail-layout">
        <div v-if="emailLoading" class="email-detail-state"><a-spin /></div>
        <a-alert v-else-if="emailError" type="error" show-icon :message="emailError" />
        <template v-else-if="emailDetail">
          <div class="email-detail-meta">
            <a-descriptions :column="1" size="small" bordered>
              <a-descriptions-item label="发件人">{{ emailDetail.from?.emailAddress?.address || '—' }}</a-descriptions-item>
              <a-descriptions-item v-if="emailDetail.toRecipients?.length" label="收件人">{{ formatRecipients(emailDetail.toRecipients) }}</a-descriptions-item>
              <a-descriptions-item v-if="emailDetail.ccRecipients?.length" label="抄送">{{ formatRecipients(emailDetail.ccRecipients) }}</a-descriptions-item>
              <a-descriptions-item label="收件时间">{{ formatDate(emailDetail.receivedDateTime) }}</a-descriptions-item>
            </a-descriptions>
            <div v-if="verificationCode" class="verification-code-panel">
              <div class="verification-code-text">
                <span class="verification-code-label">验证码</span>
                <strong class="verification-code-value">{{ verificationCode }}</strong>
              </div>
              <a-button type="primary" size="small" @click="copyVerificationCode">复制验证码</a-button>
            </div>
          </div>
          <div class="email-content-scroll">
            <iframe
              v-if="emailHtmlDocument"
              class="email-html-frame"
              :srcdoc="emailHtmlDocument"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              referrerpolicy="no-referrer"
              title="邮件正文"
            />
            <a-typography-paragraph v-else class="email-body">{{ emailPlainText }}</a-typography-paragraph>
          </div>
        </template>
      </div>
    </a-modal>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { hasPermission } from '@/utils/access'
import { mailApi, MailAccount, MailImportResult, MailTokenRefresh, EmailItem, EmailAddress } from '@/api/mail'
import { extractVerificationCode, prepareEmailContent } from '@/utils/email-content'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  InputSearch,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  TypographyParagraph
} from 'ant-design-vue'
import {
  CopyOutlined,
  DeleteOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  SyncOutlined
} from '@ant-design/icons-vue'

interface TimedMailAccount extends MailAccount {
  countdownEndsAt: number
}

interface MailAccountRow extends TimedMailAccount {
  lastRefreshTime: string
  tokenExpiry: { color: string; text: string }
}

const columns = [
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 270, ellipsis: true, align: 'center' as const },
  { title: '创建时间', key: 'createTime', width: 180, align: 'center' as const },
  { title: '最近刷新时间', key: 'lastRefreshTime', width: 190, align: 'center' as const },
  { title: '令牌有效时间', key: 'tokenExpiry', width: 190, align: 'center' as const },
  { title: '刷新结果', key: 'refreshResult', width: 130, align: 'center' as const },
  { title: '操作', key: 'actions', width: 300, align: 'center' as const }
]

export default defineComponent({
  name: 'MailManagementPage',
  components: {
    AAlert: Alert,
    AButton: Button,
    ACard: Card,
    ADescriptions: Descriptions,
    ADescriptionsItem: Descriptions.Item,
    ADrawer: Drawer,
    AForm: Form,
    AFormItem: Form.Item,
    AInputSearch: InputSearch,
    ATextarea: Input.TextArea,
    AList: List,
    AListItem: List.Item,
    AListItemMeta: List.Item.Meta,
    AModal: Modal,
    APopconfirm: Popconfirm,
    ASelect: Select,
    ASpace: Space,
    ASpin: Spin,
    ATable: Table,
    ATag: Tag,
    ATooltip: Tooltip,
    ATypographyParagraph: TypographyParagraph,
    CopyOutlined,
    DeleteOutlined,
    MailOutlined,
    PlusOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
    SyncOutlined
  },
  data() {
    return {
      columns,
      importOpen: false,
      importText: '',
      importing: false,
      importResults: null as MailImportResult[] | null,
      accounts: [] as TimedMailAccount[],
      now: performance.now(),
      countdownTimer: 0,
      loading: false,
      listError: '',
      searchText: '',
      searchTimer: null as ReturnType<typeof setTimeout> | null,
      accountRequestId: 0,
      emailFilter: '',
      currentPage: 1,
      pageSize: 20,
      total: 0,
      selectedRowKeys: [] as number[],
      refreshRequests: {} as Partial<Record<number, Promise<void>>>,
      batchRefreshing: false,
      refreshResults: {} as Record<number, { color: string; text: string }>,
      inboxOpen: false,
      activeAccount: null as TimedMailAccount | null,
      inboxLoading: false,
      inboxError: '',
      inboxHasMore: false,
      inboxTop: 10,
      inboxTopOptions: [
        { value: 5, label: '5 封' },
        { value: 10, label: '10 封' },
        { value: 20, label: '20 封' },
        { value: 50, label: '50 封' }
      ],
      inboxRequestId: 0,
      emails: [] as EmailItem[],
      emailOpen: false,
      emailLoading: false,
      emailError: '',
      emailRequestId: 0,
      emailDetail: null as EmailItem | null,
      emailHtmlDocument: '',
      emailPlainText: '',
      verificationCode: ''
    }
  },
  computed: {
    accountRows(): MailAccountRow[] {
      return this.accounts.map(account => {
        const seconds = account.lastRefreshedAt
          ? Math.max(0, Math.ceil((account.countdownEndsAt - this.now) / 1000)) : null
        return {
          ...account,
          lastRefreshTime: this.formatDate(account.lastRefreshedAt),
          tokenExpiry: this.formatTokenExpiry(seconds)
        }
      })
    },
    importSummary(): { added: number; skipped: number; failed: number } | null {
      if (!this.importResults) return null
      return {
        added: this.importResults.filter(record => record.addStatus === 1).length,
        skipped: this.importResults.filter(record => record.addStatus === 2).length,
        failed: this.importResults.filter(record => record.addStatus !== 1 && record.addStatus !== 2).length
      }
    },
    failedImportResults(): MailImportResult[] {
      return (this.importResults || []).filter(record => record.addStatus !== 1 && record.addStatus !== 2)
    },
    pagination(): Record<string, unknown> {
      return {
        current: this.currentPage,
        pageSize: this.pageSize,
        total: this.total,
        showSizeChanger: true,
        showTotal: (total: number) => `共 ${total} 个邮箱`
      }
    },
    rowSelection(): Record<string, unknown> {
      return {
        selectedRowKeys: this.selectedRowKeys,
        onChange: (keys: Array<string | number>) => {
          this.selectedRowKeys = keys.map(Number)
        }
      }
    }
  },
  mounted() {
    this.loadAccounts()
    this.countdownTimer = window.setInterval(this.updateNow, 1000)
    document.addEventListener('visibilitychange', this.updateNow)
  },
  beforeUnmount() {
    window.clearInterval(this.countdownTimer)
    document.removeEventListener('visibilitychange', this.updateNow)
    if (this.searchTimer) clearTimeout(this.searchTimer)
    this.accountRequestId += 1
    this.inboxRequestId += 1
    this.emailRequestId += 1
  },
  methods: {
    hasPermission,
    updateNow() {
      this.now = performance.now()
    },
    formatTokenExpiry(seconds: number | null) {
      if (seconds === null) return { color: 'default', text: '暂无有效期' }
      if (seconds <= 0) return { color: 'error', text: '令牌过期' }
      const expiring = seconds <= 300
      const duration = `${Math.floor(seconds / 60)} 分钟 ${seconds % 60} 秒`
      return {
        color: expiring ? 'warning' : 'success',
        text: `${expiring ? '即将过期' : '剩余'} ${duration}`
      }
    },
    withCountdown(account: MailAccount): TimedMailAccount {
      const seconds = account.remainingSeconds ?? 0
      return {
        ...account,
        countdownEndsAt: this.now + (Number.isFinite(seconds) ? Math.max(0, seconds) : 0) * 1000
      }
    },
    updateToken(result: MailTokenRefresh) {
      this.updateNow()
      const updateAccount = (account: TimedMailAccount) => account.accountId === result.accountId
        ? this.withCountdown({ ...account, lastRefreshedAt: result.lastRefreshedAt, remainingSeconds: result.remainingSeconds })
        : account
      this.accounts = this.accounts.map(updateAccount)
      if (this.activeAccount) this.activeAccount = updateAccount(this.activeAccount)
    },
    openImport() {
      this.importResults = null
      this.importOpen = true
    },
    onImportTextInput(event: Event) {
      this.importText = (event.target as HTMLTextAreaElement).value
    },
    async importAccounts() {
      const content = this.importText
      if (!content.trim()) { message.warning('请先输入账号内容'); return }
      if (new TextEncoder().encode(content).length > 5 * 1024 * 1024) {
        message.warning('导入内容不能超过 5MB')
        return
      }
      this.importing = true
      try {
        this.importResults = await mailApi.importAccounts(content)
        this.importOpen = false
        this.importText = ''
        this.currentPage = 1
        await this.loadAccounts()
        const summary = this.importSummary
        if (summary) message.success('导入完成：新增 ' + summary.added + '，跳过 ' + summary.skipped + '，失败 ' + summary.failed)
      } catch (error) {
        message.error(this.errorText(error))
      } finally {
        this.importing = false
      }
    },
    async loadAccounts() {
      const requestId = ++this.accountRequestId
      this.loading = true
      this.listError = ''
      try {
        const data = await mailApi.list({
          pageNum: this.currentPage,
          pageSize: this.pageSize,
          ...(this.emailFilter ? { email: this.emailFilter } : {})
        })
        if (requestId !== this.accountRequestId) return
        this.updateNow()
        this.accounts = (data.rows || []).map(this.withCountdown)
        this.total = data.total || 0
        this.selectedRowKeys = []
      } catch (error) {
        if (requestId !== this.accountRequestId) return
        this.accounts = []
        this.total = 0
        this.listError = this.errorText(error)
      } finally {
        if (requestId === this.accountRequestId) this.loading = false
      }
    },
    onSearchTextChange(event: Event) {
      this.searchText = (event.target as HTMLInputElement).value
      if (event.type === 'click') return
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.accountRequestId += 1
      this.searchTimer = setTimeout(() => {
        this.searchTimer = null
        this.searchAccounts()
      }, 300)
    },
    searchAccounts(value?: string) {
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = null
      if (typeof value === 'string') this.searchText = value
      this.emailFilter = this.searchText.trim()
      this.currentPage = 1
      this.loadAccounts()
    },
    handleTableChange(pagination: { current?: number; pageSize?: number }) {
      this.currentPage = pagination.current || 1
      this.pageSize = pagination.pageSize || 20
      this.loadAccounts()
    },
    async copyAddress(email: string) {
      try {
        await navigator.clipboard.writeText(email)
        message.success('邮箱地址已复制')
      } catch {
        message.error('复制失败，请检查浏览器剪贴板权限')
      }
    },
    async copySelected() {
      const addresses = this.accounts
        .filter(account => this.selectedRowKeys.includes(account.accountId))
        .map(account => account.email)
      if (!addresses.length) {
        message.warning('请先选择邮箱账号')
        return
      }
      try {
        await navigator.clipboard.writeText(addresses.join('\n'))
        message.success(`已复制 ${addresses.length} 个邮箱地址`)
      } catch {
        message.error('复制失败，请检查浏览器剪贴板权限')
      }
    },
    async refreshAccount(account: MailAccount, notify = true): Promise<boolean> {
      const { accountId, email } = account
      if (!this.refreshRequests[accountId]) {
        this.refreshRequests[accountId] = mailApi.refreshToken(accountId)
          .then(this.updateToken)
          .finally(() => { delete this.refreshRequests[accountId] })
      }
      try {
        await this.refreshRequests[accountId]
        this.refreshResults[accountId] = { color: 'success', text: '刷新成功' }
        if (notify) message.success({ key: `mail-refresh-${accountId}`, content: `${email} 的令牌刷新成功` })
        return true
      } catch (error) {
        this.refreshResults[accountId] = { color: 'error', text: '刷新失败' }
        if (notify) message.error({ key: `mail-refresh-${accountId}`, content: this.errorText(error) })
        return false
      }
    },
    async refreshSelected() {
      const selected = this.accounts.filter(account => this.selectedRowKeys.includes(account.accountId))
      if (!selected.length) {
        message.warning('请先选择邮箱账号')
        return
      }
      this.batchRefreshing = true
      let success = 0
      for (const account of selected) {
        if (await this.refreshAccount(account, false)) success += 1
      }
      this.batchRefreshing = false
      if (success === selected.length) message.success(`已刷新 ${success} 个邮箱的 Token`)
      else message.warning(`刷新完成：成功 ${success} 个，失败 ${selected.length - success} 个`)
    },
    confirmDeleteSelected() {
      if (!this.selectedRowKeys.length) {
        message.warning('请先选择邮箱账号')
        return
      }
      Modal.confirm({
        title: `删除选中的 ${this.selectedRowKeys.length} 个邮箱？`,
        content: '删除后无法恢复。',
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => this.deleteSelected()
      })
    },
    async deleteSelected() {
      const ids = [...this.selectedRowKeys]
      let success = 0
      for (const id of ids) {
        try {
          await mailApi.remove(id)
          success += 1
        } catch {
          // Continue deleting other selected accounts and report the final count.
        }
      }
      if (success === ids.length) message.success(`已删除 ${success} 个邮箱`)
      else message.warning(`删除完成：成功 ${success} 个，失败 ${ids.length - success} 个`)
      await this.loadAccounts()
    },
    async deleteAccount(account: MailAccount) {
      try {
        await mailApi.remove(account.accountId)
        message.success('邮箱已删除')
        await this.loadAccounts()
      } catch (error) {
        message.error(this.errorText(error))
      }
    },
    changeInboxTop(top: number) {
      if (top === this.inboxTop) return
      this.inboxTop = top
      if (this.activeAccount) this.openInbox(this.activeAccount)
    },
    async openInbox(account: TimedMailAccount) {
      const requestId = ++this.inboxRequestId
      this.activeAccount = account
      this.inboxOpen = true
      this.inboxLoading = true
      this.inboxError = ''
      this.emails = []
      this.inboxHasMore = false
      this.emailOpen = false
      this.emailDetail = null
      try {
        if (!account.lastRefreshedAt || (account.remainingSeconds ?? 0) <= 0) {
          if (!hasPermission('email:refresh')) {
            this.inboxError = '令牌已过期，请先刷新令牌'
            return
          }
          if (!(await this.refreshAccount(account))) {
            this.inboxError = '令牌刷新失败，请稍后重试'
            return
          }
        }
        const data = await mailApi.listEmails(account.accountId, this.inboxTop)
        if (requestId === this.inboxRequestId) {
          this.emails = data.value
          this.inboxHasMore = data.hasMore
        }
      } catch (error) {
        if (requestId === this.inboxRequestId) this.inboxError = this.errorText(error)
      } finally {
        if (requestId === this.inboxRequestId) this.inboxLoading = false
      }
    },
    async openEmail(item: EmailItem) {
      if (!hasPermission('email:detail')) return
      if (!this.activeAccount) return
      const accountId = this.activeAccount.accountId
      const requestId = ++this.emailRequestId
      this.emailOpen = true
      this.emailLoading = true
      this.emailError = ''
      this.emailDetail = null
      this.emailHtmlDocument = ''
      this.emailPlainText = ''
      this.verificationCode = ''
      try {
        const detail = await mailApi.getEmail(accountId, item.id)
        if (requestId === this.emailRequestId) {
          const content = prepareEmailContent(detail.body?.content, detail.body?.contentType, detail.bodyPreview)
          this.emailDetail = detail
          this.emailHtmlDocument = content.htmlDocument
          this.emailPlainText = content.plainText
          this.verificationCode = content.verificationCode || extractVerificationCode(detail.subject || '')
        }
      } catch (error) {
        if (requestId === this.emailRequestId) this.emailError = this.errorText(error)
      } finally {
        if (requestId === this.emailRequestId) this.emailLoading = false
      }
    },
    formatRecipients(recipients: EmailAddress[]) {
      return recipients.map(recipient => recipient.emailAddress.address || recipient.emailAddress.name || '未知地址').join('、')
    },
    formatDate(value?: string | number | null) {
      if (value == null || value === '') return '—'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false })
    },
    async copyVerificationCode() {
      if (!this.verificationCode) return
      try {
        await navigator.clipboard.writeText(this.verificationCode)
        message.success('验证码已复制')
      } catch {
        message.error('复制失败，请检查浏览器剪贴板权限')
      }
    },
    errorText(error: unknown) {
      return error instanceof Error ? error.message : '操作失败，请稍后重试'
    }
  }
})
</script>

<style scoped>
.import-summary { margin: 0 20px 16px; }
.import-textarea { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }

.mail-page {
  padding: 16px 28px 28px;
}

.mail-card {
  border-color: #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
}

.mail-toolbar {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
}

.toolbar-end {
  margin-left: auto;
}

.mail-search {
  width: 220px;
}

.mail-error {
  margin: 0 20px 16px;
}

.muted-text,
.email-time {
  color: #64748b;
}

.email-time {
  font-size: 12px;
  white-space: nowrap;
}

.token-expiry-tag { margin-inline-end: 0; font-variant-numeric: tabular-nums; }
.token-expiry-tag.ant-tag-success { color: #237804; }
.token-expiry-tag.ant-tag-warning { color: #874d00; }
.token-expiry-tag.ant-tag-error { color: #cf1322; }

.email-item {
  cursor: pointer;
}

.email-item:hover {
  background: #f8fafc;
}

.inbox-top-select {
  width: 100px;
}

.inbox-loading {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
}

.drawer-alert {
  margin-bottom: 16px;
}

.email-detail-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.email-detail-state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.email-detail-meta {
  flex: 0 1 auto;
  max-height: 50%;
  min-height: 0;
  overflow: auto;
}

.email-content-scroll {
  flex: 1;
  min-height: 0;
  margin-top: 18px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.verification-code-panel {
  margin-top: 18px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.verification-code-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.verification-code-label {
  color: #475569;
  font-size: 12px;
}

.verification-code-value {
  color: #1d4ed8;
  font: 600 24px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
  letter-spacing: 0.08em;
}

.email-html-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.email-body {
  margin: 0;
  padding: 18px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

:deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}

:deep(.ant-table-cell) {
  white-space: nowrap;
}

:deep(.ant-table-pagination.ant-pagination) {
  padding-inline: 20px;
}

@media (max-width: 900px) {
  .mail-page {
    padding: 16px;
  }

  .mail-toolbar {
    flex-wrap: wrap;
  }

  .toolbar-end {
    width: 100%;
  }

  .mail-search {
    flex: 1;
    width: auto;
  }
}
</style>
