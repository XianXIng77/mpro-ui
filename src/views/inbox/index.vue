<template>
  <main class="inbox-page">
    <header class="inbox-header">
      <div class="mailbox-identity">
        <a-avatar :size="44" shape="square" class="mailbox-icon"><template #icon><MailOutlined /></template></a-avatar>
        <h1>{{ account ? account.email : '收件箱' }}</h1>
        <a-tooltip v-if="account" title="复制邮箱地址">
          <a-button type="text" aria-label="复制邮箱地址" @click="copyText(account.email, '邮箱地址')"><template #icon><CopyOutlined /></template></a-button>
        </a-tooltip>
      </div>
      <a-space class="inbox-actions" :size="12">
        <a-select v-model:value="top" :options="topOptions" :disabled="loading || requiresLogin" aria-label="邮件数量" @change="load" />
        <a-button type="primary" :loading="loading" :disabled="requiresLogin" @click="load"><template #icon><ReloadOutlined /></template>刷新邮件</a-button>
      </a-space>
    </header>

    <div v-if="requiresLogin" class="page-state">
      <a-result status="403" title="请登录后查看邮件" sub-title="登录后将返回当前收件箱。">
        <template #extra><a-button type="primary" @click="goLogin">前往登录</a-button></template>
      </a-result>
    </div>
    <div v-else-if="errorMessage" class="page-state">
      <a-result status="warning" title="邮件加载失败" :sub-title="errorMessage">
        <template #extra><a-button type="primary" @click="load">重新加载</a-button></template>
      </a-result>
    </div>
    <div v-else-if="loading" class="page-state inbox-loading-state" role="status" aria-live="polite" aria-busy="true">
      <a-spin size="large" />
      <h2>正在加载</h2>
      <p>请稍候，收件箱马上就绪。</p>
    </div>
    <div v-else class="inbox-workspace" :class="{ 'is-reading': showReader }">
      <aside class="message-sidebar" aria-label="邮件列表">
        <div class="sidebar-heading"><h2>收件箱</h2><a-tag v-if="!loading">{{ emails.length }} 封</a-tag></div>
        <div v-if="!emails.length" class="pane-state"><a-empty :image="emptyImage" description="暂无邮件" /></div>
        <a-list v-else class="message-list" :data-source="emails" :split="false">
          <template #renderItem="{ item }">
            <a-list-item>
              <button type="button" class="message-row" :class="{ selected: selectedEmail?.id === item.id }" :aria-pressed="selectedEmail?.id === item.id" @click="openEmail(item)">
                <span class="message-row-top"><strong>{{ senderLabel(item) }}</strong><time :datetime="item.receivedDateTime" :title="formatDate(item.receivedDateTime)">{{ formatTime(item.receivedDateTime) }}</time></span>
                <span class="message-subject">{{ item.subject || '（无主题）' }}</span>
                <span class="message-preview">{{ item.bodyPreview || '查看邮件内容' }}</span>
              </button>
            </a-list-item>
          </template>
        </a-list>
        <footer class="sidebar-footer">
          <span v-if="inboxHasMore">显示最近 {{ top }} 封邮件</span><span v-else>共 {{ emails.length }} 封邮件</span>
          <span v-if="updatedAt">{{ updatedAt }} 更新</span>
        </footer>
      </aside>

      <section class="message-reader" aria-label="邮件详情" :aria-busy="emailLoading">
        <div class="reader-toolbar">
          <a-button type="text" class="back-to-list" @click="showReader = false"><template #icon><ArrowLeftOutlined /></template>邮件列表</a-button>
          <span class="reader-label"><ReadOutlined />邮件详情</span>
        </div>
        <div v-if="!selectedEmail" class="pane-state reader-placeholder">
          <ReadOutlined class="placeholder-icon" aria-hidden="true" />
          <h2>选择一封邮件</h2>
          <p>在左侧选择邮件，查看内容和验证码</p>
        </div>
        <template v-else>
          <div v-if="emailLoading" class="pane-state" role="status" aria-label="正在加载邮件详情"><a-spin /></div>
          <div v-else-if="emailError" class="detail-error">
            <a-alert type="error" show-icon :message="emailError"><template #action><a-button size="small" @click="openEmail(selectedEmail)">重试</a-button></template></a-alert>
          </div>
          <template v-else-if="emailDetail">
            <div class="reader-heading">
              <h2>{{ emailDetail.subject || '（无主题）' }}</h2>
              <a-descriptions :column="1" size="small" class="message-meta">
                <a-descriptions-item label="发件人">{{ emailDetail.from?.emailAddress?.address || '未知发件人' }}</a-descriptions-item>
                <a-descriptions-item v-if="emailDetail.toRecipients?.length" label="收件人">{{ formatRecipients(emailDetail.toRecipients) }}</a-descriptions-item>
                <a-descriptions-item v-if="emailDetail.ccRecipients?.length" label="抄送">{{ formatRecipients(emailDetail.ccRecipients) }}</a-descriptions-item>
                <a-descriptions-item label="时间">{{ formatDate(emailDetail.receivedDateTime) }}</a-descriptions-item>
              </a-descriptions>
              <div v-if="verificationCode" class="verification-code">
                <div class="verification-value"><span>验证码</span><strong>{{ verificationCode }}</strong></div>
                <a-button type="primary" @click="copyText(verificationCode, '验证码')"><template #icon><CopyOutlined /></template>复制验证码</a-button>
              </div>
            </div>
            <div class="message-body">
              <iframe v-if="emailContent.htmlDocument" :key="emailDetail.id" class="email-html-frame" :srcdoc="emailContent.htmlDocument" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer" title="邮件正文" />
              <a-typography-paragraph v-else class="email-plain-text">{{ emailContent.plainText }}</a-typography-paragraph>
            </div>
          </template>
        </template>
      </section>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Alert, Avatar, Button, Descriptions, Empty, List, Result, Select, Space, Spin, Tag, Tooltip, TypographyParagraph, message } from 'ant-design-vue'
import { ArrowLeftOutlined, CopyOutlined, MailOutlined, ReadOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { inboxApi } from '@/api/inbox'
import type { InboxAccount } from '@/api/inbox'
import type { EmailAddress, EmailItem } from '@/api/mail'
import { ApiError } from '@/utils/request'
import { extractVerificationCode, prepareEmailContent } from '@/utils/email-content'
import type { PreparedEmailContent } from '@/utils/email-content'

export default defineComponent({
  name: 'InboxPage',
  components: {
    AAlert: Alert, AAvatar: Avatar, AButton: Button, ADescriptions: Descriptions,
    ADescriptionsItem: Descriptions.Item, AEmpty: Empty, AList: List, AListItem: List.Item,
    AResult: Result, ASelect: Select, ASpace: Space, ASpin: Spin, ATag: Tag, ATooltip: Tooltip,
    ATypographyParagraph: TypographyParagraph, ArrowLeftOutlined, CopyOutlined, MailOutlined, ReadOutlined, ReloadOutlined
  },
  data() {
    return {
      account: null as InboxAccount | null,
      emails: [] as EmailItem[],
      selectedEmail: null as EmailItem | null,
      emailDetail: null as EmailItem | null,
      emptyImage: Empty.PRESENTED_IMAGE_SIMPLE,
      top: 10,
      topOptions: [5, 10, 20, 50].map(value => ({ value, label: `最近 ${value} 封` })),
      loading: true, emailLoading: false, showReader: false, inboxHasMore: false,
      errorMessage: '', errorCode: 0, emailError: '', updatedAt: '',
      requestId: 0, emailRequestId: 0
    }
  },
  computed: {
    accountId(): number { return Number(this.$route.params.accountId) },
    requiresLogin(): boolean { return this.errorCode === 401 },
    emailContent(): PreparedEmailContent {
      const detail = this.emailDetail
      return prepareEmailContent(detail?.body?.content, detail?.body?.contentType, detail?.bodyPreview)
    },
    verificationCode(): string { return this.emailContent.verificationCode || extractVerificationCode(this.emailDetail?.subject || '') }
  },
  watch: {
    accountId: { immediate: true, handler() { this.account = null; this.load() } }
  },
  beforeUnmount() { this.requestId += 1; this.emailRequestId += 1 },
  methods: {
    async load() {
      const requestId = ++this.requestId
      this.emailRequestId += 1
      this.emails = []
      this.selectedEmail = null
      this.emailDetail = null
      this.emailLoading = false
      this.showReader = false
      this.inboxHasMore = false
      this.errorMessage = ''
      this.errorCode = 0
      this.loading = true
      try {
        if (!Number.isInteger(this.accountId) || this.accountId <= 0) throw new Error('收件箱地址无效')
        const account = await inboxApi.account(this.accountId)
        if (requestId !== this.requestId) return
        this.account = account
        const data = await inboxApi.listEmails(this.accountId, this.top)
        if (requestId !== this.requestId) return
        this.emails = data.value
        this.inboxHasMore = data.hasMore
        this.updatedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })
        if (this.emails.length) this.openEmail(this.emails[0], false)
      } catch (error) {
        if (requestId === this.requestId) this.setError(error)
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    setError(error: unknown) {
      this.errorCode = error instanceof ApiError ? error.code : 0
      this.errorMessage = error instanceof Error ? error.message : '邮件加载失败，请稍后重试'
    },
    goLogin() { this.$router.push({ path: '/login', query: { redirect: this.$route.fullPath } }) },
    async openEmail(item: EmailItem, showReader = true) {
      const requestId = ++this.emailRequestId
      this.selectedEmail = item
      this.showReader = showReader
      this.emailDetail = null
      this.emailError = ''
      this.emailLoading = true
      try {
        const detail = await inboxApi.getEmail(this.accountId, item.id)
        if (requestId === this.emailRequestId) this.emailDetail = detail
      } catch (error) {
        if (requestId !== this.emailRequestId) return
        if (error instanceof ApiError && error.code === 401) this.setError(error)
        else this.emailError = error instanceof Error ? error.message : '邮件详情加载失败，请稍后重试'
      } finally {
        if (requestId === this.emailRequestId) this.emailLoading = false
      }
    },
    senderLabel(item: EmailItem): string { return item.from?.emailAddress?.name || item.from?.emailAddress?.address || '未知发件人' },
    formatRecipients(recipients: EmailAddress[]): string { return recipients.map(item => item.emailAddress.address || item.emailAddress.name || '未知地址').join('、') },
    formatDate(value?: string): string {
      const date = new Date(value || '')
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false })
    },
    formatTime(value?: string): string {
      const date = new Date(value || '')
      if (Number.isNaN(date.getTime())) return '—'
      return date.toDateString() === new Date().toDateString()
        ? date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    },
    async copyText(text: string, label: string) {
      if (!text) return
      try { await navigator.clipboard.writeText(text); message.success(`${label}已复制`) }
      catch { message.error('复制失败，请检查浏览器剪贴板权限') }
    }
  }
})
</script>

<style scoped>
.inbox-page { --ink: #262626; --muted: #64748b; --line: #e5e7eb; display: flex; flex-direction: column; width: 100%; height: 100vh; height: 100dvh; overflow: hidden; color: var(--ink); background: #fff; }
.inbox-page ::selection { color: #164c9e; background: #dbeafe; }
.inbox-header { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 24px; min-height: 88px; padding: 20px 28px; border-bottom: 1px solid var(--line); }
.mailbox-identity { display: flex; align-items: center; gap: 14px; min-width: 0; }
.mailbox-icon { flex-shrink: 0; color: #1677ff; background: #eff6ff; border-radius: 12px; }
.mailbox-identity h1 { min-width: 0; margin: 0; font-size: 18px; font-weight: 600; overflow-wrap: anywhere; }
.mailbox-identity :deep(.ant-btn) { flex-shrink: 0; color: var(--muted); }
.inbox-actions { flex-shrink: 0; }
.inbox-actions :deep(.ant-select) { width: 120px; }
.inbox-workspace { display: grid; grid-template-columns: clamp(300px, 29vw, 420px) minmax(0, 1fr); flex: 1; min-height: 0; }
.message-sidebar { display: flex; min-width: 0; min-height: 0; flex-direction: column; border-right: 1px solid var(--line); background: #f8fafc; }
.sidebar-heading, .reader-toolbar { display: flex; align-items: center; gap: 12px; min-height: 60px; flex-shrink: 0; padding: 16px 24px; }
.sidebar-heading { justify-content: space-between; }
.sidebar-heading h2 { margin: 0; font-size: 14px; font-weight: 600; }
.sidebar-heading :deep(.ant-tag) { margin: 0; color: var(--muted); border-color: var(--line); background: #fff; font-variant-numeric: tabular-nums; }
.message-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 12px 12px; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
.message-list :deep(.ant-list-item) { display: block; padding: 0; margin-bottom: 4px; }
.message-row { display: block; width: 100%; padding: 16px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color .15s ease, border-color .15s ease; }
.message-row:hover { background: #eef2f6; }
.message-row.selected { border-color: #bfdbfe; background: #eff6ff; }
.message-row:focus-visible { outline: 2px solid #1677ff; outline-offset: -2px; }
.message-row-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.message-row-top strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; }
.message-row-top time { flex-shrink: 0; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.message-subject { display: block; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.message-preview { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: var(--muted); font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; }
.selected .message-row-top strong, .selected .message-subject { color: #164c9e; }
.selected .message-row-top time, .selected .message-preview { color: #41648e; }
.sidebar-footer { display: flex; flex-shrink: 0; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 16px 24px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.message-reader { display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
.reader-toolbar { padding-inline: 32px; border-bottom: 1px solid #f0f2f5; }
.reader-label { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; }
.back-to-list { display: none; }
.reader-heading { flex-shrink: 0; padding: 28px 32px 24px; border-bottom: 1px solid var(--line); }
.reader-heading h2 { margin: 0 0 20px; font-size: 22px; line-height: 1.5; font-weight: 600; overflow-wrap: anywhere; }
.message-meta :deep(.ant-descriptions-item-label) { width: 64px; color: var(--muted); font-size: 12px; }
.message-meta :deep(.ant-descriptions-item-content) { font-size: 13px; overflow-wrap: anywhere; }
.message-meta :deep(.ant-descriptions-row > td) { padding-bottom: 6px; }
.verification-code { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-top: 22px; padding: 16px 20px; border: 1px solid #bfdbfe; border-radius: 10px; background: #eff6ff; }
.verification-value { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
.verification-value span { color: #41648e; font-size: 13px; }
.verification-value strong { color: #1d4ed8; font: 600 28px/1.2 'Cascadia Code', Consolas, monospace; letter-spacing: .08em; }
.message-body { display: flex; flex: 1 0 320px; min-width: 0; padding: 12px; }
.email-html-frame { display: block; flex: 1; width: 100%; min-height: 320px; border: 0; background: #fff; }
.email-plain-text { width: 100%; margin: 0; padding: 20px; color: var(--ink); white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; }
.page-state, .pane-state { display: flex; flex: 1; min-height: 180px; align-items: center; justify-content: center; padding: 24px; }
.inbox-loading-state { flex-direction: column; gap: 16px; background: #fcfdff; text-align: center; }
.inbox-loading-state h2 { margin: 8px 0 0; color: var(--ink); font-size: 18px; font-weight: 600; }
.inbox-loading-state p { margin: 0; color: var(--muted); font-size: 13px; }
.reader-placeholder { flex-direction: column; background: #fcfdff; text-align: center; }
.placeholder-icon { margin-bottom: 20px; color: #94a3b8; font-size: 48px; }
.reader-placeholder h2 { margin: 0 0 8px; font-size: 18px; font-weight: 500; }
.reader-placeholder p { margin: 0; color: var(--muted); font-size: 13px; }
.detail-error { padding: 24px 32px; }
@media (max-width: 760px) {
  .inbox-header { flex-wrap: wrap; gap: 16px; padding: 16px; }
  .mailbox-identity { width: 100%; gap: 10px; }
  .mailbox-identity h1 { flex: 1; font-size: 16px; }
  .inbox-actions { width: 100%; justify-content: flex-end; }
  .inbox-workspace { grid-template-columns: minmax(0, 1fr); }
  .message-sidebar { border: 0; }
  .message-reader { display: none; }
  .is-reading .message-sidebar { display: none; }
  .is-reading .message-reader { display: flex; }
  .back-to-list { display: inline-flex; align-items: center; }
  .reader-label { margin-left: auto; }
  .reader-toolbar { padding: 12px 16px; }
  .reader-heading { padding: 24px 20px; }
  .reader-heading h2 { font-size: 19px; }
  .verification-code { padding: 16px; }
  .verification-value { gap: 12px; }
  .verification-value strong { font-size: 24px; }
  .detail-error { padding: 20px; }
}
@media (prefers-reduced-motion: reduce) { .message-row { transition: none; } }
</style>
