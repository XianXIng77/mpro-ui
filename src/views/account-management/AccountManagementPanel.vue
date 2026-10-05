<template>
  <div class="account-panel">
      <div v-if="!embedded" class="workspace-toolbar">
        <div class="account-title"><h2>OpenAI 账号</h2></div>
        <a-space :size="8" wrap>
          <a-button @click="$router.push('/ai-register')"><template #icon><RobotOutlined /></template>前往注册</a-button>
        </a-space>
      </div>

      <div class="account-filters">
        <a-input v-model:value="filters.keyword" allow-clear placeholder="搜索邮箱" aria-label="搜索账号邮箱" class="account-search"><template #prefix><SearchOutlined /></template></a-input>
        <a-select v-model:value="filters.trial" :options="trialOptions" aria-label="试用资格筛选" />
        <a-select v-model:value="filters.checkout" :options="checkoutOptions" aria-label="Checkout 类型筛选" />
        <a-select v-model:value="filters.payment" :options="paymentOptions" aria-label="支付方式筛选" />
        <a-button type="text" @click="resetFilters">重置筛选</a-button>
        <a-button :loading="loading" aria-label="刷新账号列表" @click="loadAccounts"><template #icon><ReloadOutlined /></template></a-button>
      </div>

      <div class="account-summary">
        <a-space :size="16" wrap><span>共 <strong>{{ summary.total }}</strong> 个账号</span><span>可试用 <strong>{{ summary.eligible }}</strong></span><span>已获取 AT <strong>{{ summary.tokens }}</strong></span></a-space>
        <a-space class="account-actions" :size="8" wrap>
          <span v-if="selectedKeys.length">已选 {{ selectedKeys.length }} 条 · 可复制 AT {{ selectedTokens.length }} 条 <a-button type="link" size="small" @click="selectedKeys = []">清空</a-button></span>
          <a-button v-if="canCopyCredentials" size="small" :loading="copying" @click="copySelectedTokens"><template #icon><CopyOutlined /></template>复制所选 AT</a-button>
          <a-button size="small" @click="showExportPlaceholder"><template #icon><DownloadOutlined /></template>导出</a-button>
        </a-space>
      </div>

      <a-alert v-if="listError" type="error" show-icon :message="listError" />
      <a-table row-key="id" :columns="columns" :data-source="accounts" :loading="loading" :row-selection="canCopyCredentials ? rowSelection : undefined" :pagination="false" :scroll="{ x: 710 }">
        <template #emptyText><a-empty v-if="!loading" :description="listError ? '账号加载失败' : '没有符合条件的账号'"><a-button v-if="hasFilters" @click="resetFilters">清除筛选</a-button></a-empty></template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'email'"><a-button type="link" size="small" :aria-label="'复制邮箱 ' + record.email" @click="copyText(record.email, '邮箱地址')">{{ record.email }}</a-button></template>
          <template v-else-if="column.key === 'trial'"><a-tag :color="trialStates[record.trial].color">{{ trialStates[record.trial].label }}</a-tag></template>
          <template v-else-if="column.key === 'checkout'"><a-tag v-if="['oaics', 'cs_live', 'cs_test'].includes(record.checkout)" class="checkout-type">{{ record.checkout }}</a-tag><span v-else class="muted">{{ checkoutLabel(record.checkout) }}</span></template>
          <template v-else-if="column.key === 'payments'"><a-space v-if="record.payments.length" :size="[4, 4]" wrap class="payment-tags"><a-tag v-for="method in record.payments" :key="method" :color="paymentColor(method)">{{ paymentLabel(method) }}</a-tag></a-space><a-tag v-else :color="paymentStates[record.paymentStatus].color">{{ paymentStates[record.paymentStatus].label }}</a-tag></template>
          <template v-else-if="column.key === 'registeredAt'"><span class="account-date">{{ record.registeredAt }}</span></template>
          <template v-else-if="column.key === 'actions'"><a-space :size="0"><a-button type="link" size="small" :disabled="!record.mailAccountId" :loading="refreshingAccountId === record.id" :aria-label="'收信 ' + record.email" @click="openInbox(record)">收信</a-button><a-button type="link" size="small" :aria-label="'账号详情 ' + record.email" @click="activeAccount = record">详情</a-button></a-space></template>
        </template>
      </a-table>
      <a-pagination class="account-pagination" v-bind="pagination" @change="changePage" />
    <a-drawer :open="!!activeAccount" title="账号详情" width="min(440px, 100vw)" :get-container="true" :body-style="{ color: 'var(--ink)' }" @close="activeAccount = null">
      <template v-if="activeAccount">
        <div class="detail-heading"><h2>{{ activeAccount.email }}</h2><a-tag>OpenAI</a-tag></div>
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="注册时间">{{ activeAccount.registeredAt }}</a-descriptions-item>
          <a-descriptions-item label="最近检测">{{ activeAccount.checkedAt || '尚未检测' }}</a-descriptions-item>
        </a-descriptions>

        <section class="detail-section">
          <div class="detail-section-title"><h3>Plus 试用资格</h3><a-tag :color="trialStates[activeAccount.trial].color">{{ trialStates[activeAccount.trial].label }}</a-tag></div>
          <p>{{ activeAccount.trialReason }}</p>
        </section>
        <section class="detail-section">
          <div class="detail-section-title"><h3>Checkout 类型</h3><a-tag class="checkout-type">{{ checkoutLabel(activeAccount.checkout) }}</a-tag></div>
          <p>{{ activeAccount.checkoutReason }}</p>
        </section>
        <section class="detail-section">
          <div class="detail-section-title"><h3>支付方式</h3><a-tag :color="paymentStates[activeAccount.paymentStatus].color">{{ paymentStates[activeAccount.paymentStatus].label }}</a-tag></div>
          <a-space v-if="activeAccount.payments.length" :size="[6, 6]" wrap><a-tag v-for="method in activeAccount.payments" :key="method" :color="paymentColor(method)">{{ paymentLabel(method) }}</a-tag></a-space>
          <p v-else>{{ paymentExplanation(activeAccount.paymentStatus) }}</p>
          <p v-if="activeAccount.country">地区 {{ activeAccount.country }} · 币种 {{ activeAccount.currency }}</p>
        </section>
        <section class="detail-section">
          <div class="detail-section-title"><h3>账号凭据</h3></div>
          <div class="credential-row"><div><strong>Access Token</strong><p>{{ activeAccount.hasAccessToken ? '已获取，可复制' : '未获取 AT' }}</p></div><a-button v-if="canCopyCredentials" :disabled="!activeAccount.hasAccessToken" :loading="copying" @click="copyCredentials([activeAccount.id], 'accessToken')"><template #icon><CopyOutlined /></template>复制 AT</a-button></div>
          <div class="credential-row"><div><strong>注册密码</strong><p>{{ activeAccount.hasPassword ? '••••••••••••' : '未保存密码' }}</p></div><a-button v-if="canCopyCredentials" :disabled="!activeAccount.hasPassword" :loading="copying" @click="copyCredentials([activeAccount.id], 'password')"><template #icon><CopyOutlined /></template>复制密码</a-button></div>
        </section>
      </template>
    </a-drawer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Alert, Button, Descriptions, Drawer, Empty, Input, Pagination, Select, Space, Table, Tag, message } from 'ant-design-vue'
import type { PaginationProps, TableColumnsType, TableProps } from 'ant-design-vue'
import { CopyOutlined, DownloadOutlined, ReloadOutlined, RobotOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { mailApi } from '@/api/mail'
import { openAiAccountApi } from '@/api/openai-account'
import type { OpenAiAccount } from '@/api/openai-account'
import { hasPermission } from '@/utils/access'
import { CHECKOUT_TYPES, PAYMENT_METHODS, PAYMENT_STATES, TRIAL_STATES } from './constants'

const columns: TableColumnsType = [
  { title: '注册邮箱', key: 'email', width: 180, align: 'center' },
  { title: '试用资格', key: 'trial', width: 78, align: 'center' },
  { title: 'Checkout 类型', key: 'checkout', width: 102, align: 'center' },
  { title: '支付方式', key: 'payments', width: 155, align: 'center' },
  { title: '注册时间', key: 'registeredAt', width: 125, align: 'center' },
  { title: '操作', key: 'actions', width: 105, align: 'center' }
]
const PAYMENT_COLORS: Record<string, string> = { card: 'purple', paypal: 'blue', apple_pay: 'gold', gcash: 'cyan', gopay: 'green' }
const emptyFilters = () => ({ keyword: '', trial: '', checkout: '', payment: '' })

export default defineComponent({
  name: 'AccountManagementPanel',
  props: { embedded: Boolean },
  components: {
    AAlert: Alert, AButton: Button, ADescriptions: Descriptions,
    ADescriptionsItem: Descriptions.Item, ADrawer: Drawer, AEmpty: Empty, AInput: Input, APagination: Pagination, ASelect: Select,
    ASpace: Space, ATable: Table, ATag: Tag, CopyOutlined, DownloadOutlined, ReloadOutlined, RobotOutlined, SearchOutlined
  },
  data() {
    return {
      accounts: [] as OpenAiAccount[], columns, filters: emptyFilters(), selectedKeys: [] as number[], selectedAccounts: [] as OpenAiAccount[],
      loading: false, copying: false, listError: '', total: 0, summary: { total: 0, eligible: 0, tokens: 0 },
      requestId: 0, searchTimer: undefined as number | undefined,
      currentPage: 1, pageSize: 10, activeAccount: null as OpenAiAccount | null, refreshingAccountId: null as number | null,
      trialStates: TRIAL_STATES, paymentStates: PAYMENT_STATES,
      trialOptions: [{ value: '', label: '全部试用' }, ...Object.entries(TRIAL_STATES).map(([value, state]) => ({ value, label: state.label }))],
      checkoutOptions: [{ value: '', label: '全部类型' }, ...CHECKOUT_TYPES],
      paymentOptions: [{ value: '', label: '全部支付' }, ...PAYMENT_METHODS]
    }
  },
  computed: {
    canCopyCredentials(): boolean { return hasPermission('register:token:read') },
    hasFilters(): boolean { return Object.values(this.filters).some(Boolean) },
    selectedTokens(): OpenAiAccount[] { return this.selectedAccounts.filter(account => this.selectedKeys.includes(account.id) && account.hasAccessToken) },
    rowSelection(): TableProps<OpenAiAccount>['rowSelection'] {
      return { selectedRowKeys: this.selectedKeys, preserveSelectedRowKeys: true, onChange: (keys, rows) => { this.selectedKeys = keys.map(Number); this.selectedAccounts = rows.filter(Boolean) } }
    },
    pagination(): PaginationProps {
      return { current: this.currentPage, pageSize: this.pageSize, total: this.total, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'], showTotal: (total: number) => `共 ${total} 条` }
    }
  },
  watch: {
    filters: { deep: true, handler() {
      this.currentPage = 1
      this.selectedKeys = []
      this.selectedAccounts = []
      this.requestId++
      window.clearTimeout(this.searchTimer)
      this.searchTimer = window.setTimeout(this.loadAccounts, 300)
    } },
    canCopyCredentials(value: boolean) { if (!value) { this.selectedKeys = []; this.selectedAccounts = [] } }
  },
  mounted() { this.loadAccounts() },
  beforeUnmount() { window.clearTimeout(this.searchTimer); this.requestId++ },
  methods: {
    async loadAccounts() {
      window.clearTimeout(this.searchTimer)
      const requestId = ++this.requestId
      this.loading = true
      this.listError = ''
      try {
        const [page, summary] = await Promise.all([
          openAiAccountApi.list({ ...this.filters, pageNum: this.currentPage, pageSize: this.pageSize }),
          openAiAccountApi.summary()
        ])
        if (requestId !== this.requestId) return
        this.accounts = page.rows
        this.total = page.total
        this.summary = summary
      } catch (error) {
        if (requestId !== this.requestId) return
        this.accounts = []
        this.total = 0
        this.summary = { total: 0, eligible: 0, tokens: 0 }
        this.listError = error instanceof Error ? error.message : '账号加载失败，请稍后重试'
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    resetFilters() { this.filters = emptyFilters() },
    changePage(page: number, pageSize: number) {
      this.pageSize = pageSize
      this.currentPage = page
      this.loadAccounts()
    },
    checkoutLabel(value: string): string { return CHECKOUT_TYPES.find(option => option.value === value)?.label || '未识别' },
    paymentLabel(value: string): string { return PAYMENT_METHODS.find(option => option.value === value)?.label || value },
    paymentColor(value: string): string { return PAYMENT_COLORS[value] || 'default' },
    paymentExplanation(status: OpenAiAccount['paymentStatus']): string {
      return { detected: '已获取可用支付方式。', unknown: '注册时未检测支付方式。', error: '本次检测未成功，暂时无法确认支付方式。', none: '检测已完成，未发现可用支付方式。' }[status]
    },
    async copyText(text: string, label: string) {
      if (!text) return
      try { await navigator.clipboard.writeText(text); message.success(`${label}已复制`) }
      catch { message.error('复制失败，请检查浏览器剪贴板权限') }
    },
    copySelectedTokens() {
      if (!this.canCopyCredentials) return
      if (!this.selectedTokens.length) { message.info(this.selectedKeys.length ? '所选账号暂无 AT' : '请先选择需要复制的账号'); return }
      this.copyCredentials(this.selectedTokens.map(account => account.id), 'accessToken')
    },
    async copyCredentials(ids: number[], field: 'accessToken' | 'password') {
      if (!this.canCopyCredentials || this.copying) return
      if (ids.length > 100) { message.info('每次最多复制 100 个账号'); return }
      this.copying = true
      try {
        const credentials = await openAiAccountApi.credentials(ids)
        const values = credentials.map(account => account[field]).filter(Boolean)
        if (!values.length) { message.info(field === 'accessToken' ? '所选账号暂无 AT' : '账号尚未保存密码'); return }
        await this.copyText(values.join('\n'), field === 'accessToken' ? `${values.length} 条 AT ` : '密码')
      } catch (error) {
        message.error(error instanceof Error ? error.message : '凭据读取失败，请稍后重试')
      } finally {
        this.copying = false
      }
    },
    showExportPlaceholder() { message.info('导出功能即将支持') },
    async openInbox(account: OpenAiAccount) {
      if (!account.mailAccountId || this.refreshingAccountId !== null) return
      const inboxWindow = window.open('about:blank', '_blank')
      if (!inboxWindow) {
        message.error('收件箱窗口打开失败，请允许浏览器打开新窗口后重试')
        return
      }
      inboxWindow.opener = null
      this.showInboxLoading(inboxWindow)
      this.refreshingAccountId = account.id
      try {
        await mailApi.refreshToken(account.mailAccountId)
        const route = this.$router.resolve({ name: 'Inbox', params: { accountId: account.mailAccountId } })
        inboxWindow.location.replace(route.href)
        message.success(`${account.email} 的令牌刷新成功`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '令牌刷新失败，请稍后重试'
        this.showInboxError(inboxWindow, errorMessage)
        message.error(errorMessage)
      } finally {
        this.refreshingAccountId = null
      }
    },
    showInboxLoading(target: Window) {
      this.renderInboxState(target, '正在加载', '请稍候，收件箱马上就绪。', false)
    },
    showInboxError(target: Window, detail: string) {
      this.renderInboxState(target, '收件箱加载失败', detail, true)
    },
    renderInboxState(target: Window, title: string, description: string, error: boolean) {
      const page = target.document
      page.title = '收件箱'
      page.head.innerHTML = '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>\n'
        + '*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f7f9fc}.loading-page{position:relative;display:flex;min-height:100vh;align-items:center;justify-content:center;overflow:hidden;padding:24px;background:radial-gradient(circle at 50% 35%,#fff 0,#f7f9fc 58%,#eef2f7 100%)}.loading-page:before,.loading-page:after{position:absolute;border:1px solid rgba(22,119,255,.08);border-radius:50%;content:""}.loading-page:before{width:580px;height:580px}.loading-page:after{width:820px;height:820px}.state{position:relative;z-index:1;width:min(440px,100%);padding:38px 34px 34px;border:1px solid rgba(255,255,255,.9);border-radius:24px;background:rgba(255,255,255,.88);text-align:center;box-shadow:0 24px 70px rgba(30,55,90,.12),0 2px 8px rgba(30,55,90,.04);backdrop-filter:blur(14px)}.brand{display:inline-flex;align-items:center;gap:9px;margin-bottom:32px;color:#50617a;font-size:13px;font-weight:600;letter-spacing:.04em}.brand-mark{display:grid;width:25px;height:25px;place-items:center;border-radius:8px;background:linear-gradient(145deg,#1677ff,#65a7ff);box-shadow:0 5px 12px rgba(22,119,255,.25)}.brand-mark svg{width:15px;height:15px;color:#fff;fill:currentColor}.spinner-wrap{position:relative;width:76px;height:76px;margin:0 auto 26px}.spinner{position:absolute;inset:0;border:3px solid #e6f0ff;border-top-color:#1677ff;border-right-color:#69a6ff;border-radius:50%;animation:spin .9s cubic-bezier(.4,0,.2,1) infinite}.spinner:after{position:absolute;top:7px;right:4px;width:7px;height:7px;border-radius:50%;background:#1677ff;box-shadow:0 0 0 5px rgba(22,119,255,.1);content:""}.spinner-dot{position:absolute;inset:23px;border-radius:50%;background:#eef6ff;box-shadow:inset 0 0 0 1px #dbeafe}.error{display:grid;width:76px;height:76px;margin:0 auto 26px;place-items:center;border:1px solid #ffd6d2;border-radius:50%;background:#fff2f0;color:#ff4d4f;font-size:30px;font-weight:600}.title{margin:0 0 10px;font-size:23px;line-height:1.3;font-weight:650;letter-spacing:-.02em}.description{margin:0;color:#75839a;font-size:14px;line-height:1.7}.progress{height:4px;margin:28px 8px 0;overflow:hidden;border-radius:99px;background:#edf3fb}.progress span{display:block;width:42%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#78b4ff,#1677ff);animation:progress 1.6s ease-in-out infinite}@keyframes spin{to{transform:rotate(360deg)}}@keyframes progress{0%{transform:translateX(-120%)}100%{transform:translateX(260%)}}\n</style>'
      page.body.innerHTML = `<main class="loading-page"><section class="state" role="status" aria-live="polite"><div class="brand"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 1024 1024" fill="currentColor"><path d="M885.2 446.3l-.2-.8-112.2-285.1c-5-16.1-19.9-27.2-36.8-27.2H281.2c-17 0-32.1 11.3-36.9 27.6L139.4 443l-.3.7-.2.8c-1.3 4.9-1.7 9.9-1 14.8-.1 1.6-.2 3.2-.2 4.8V830a60.9 60.9 0 0060.8 60.8h627.2c33.5 0 60.8-27.3 60.9-60.8V464.1c0-1.3 0-2.6-.1-3.7.4-4.9 0-9.6-1.3-14.1zm-295.8-43l-.3 15.7c-.8 44.9-31.8 75.1-77.1 75.1-22.1 0-41.1-7.1-54.8-20.6S436 441.2 435.6 419l-.3-15.7H229.5L309 210h399.2l81.7 193.3H589.4zm-375 76.8h157.3c24.3 57.1 76 90.8 140.4 90.8 33.7 0 65-9.4 90.3-27.2 22.2-15.6 39.5-37.4 50.7-63.6h156.5V814H214.4V480.1z"/></svg></span><span>Mercurypro</span></div><div class="${error ? 'error' : 'spinner-wrap'}">${error ? '!' : '<span class="spinner"></span><span class="spinner-dot"></span>'}</div><h1 class="title"></h1><p class="description"></p>${error ? '' : '<div class="progress"><span></span></div>'}</section></main>`
      const state = page.querySelector('.state')
      if (state) state.setAttribute('aria-busy', String(!error))
      const titleNode = page.querySelector('.title')
      const descriptionNode = page.querySelector('.description')
      if (titleNode) titleNode.textContent = title
      if (descriptionNode) descriptionNode.textContent = description
    }
  }
})
</script>

<style scoped>
.account-panel { display: flex; min-height: 0; height: 100%; flex-direction: column; }
.workspace-toolbar, .account-filters, .account-summary, .account-pagination { flex-shrink: 0; }
.account-pagination { display: flex; flex-wrap: wrap; justify-content: flex-end; row-gap: 8px; padding: 16px 20px; }
.account-title { display: flex; align-items: center; gap: 10px; }
.account-title h2 { margin: 0; color: var(--ink); font-size: 16px; font-weight: 600; }
.account-filters { display: flex; flex-wrap: wrap; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--line); }
.account-search { flex: 1; min-width: 200px; max-width: 300px; }
.account-filters :deep(.ant-select) { width: 145px; }
.account-summary { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 20px; background: var(--subtle); color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.account-summary strong { color: var(--ink); font-weight: 600; }
.account-actions { justify-content: flex-end; }
.payment-tags { justify-content: center; max-width: 145px; margin-inline: auto; }
.checkout-type { font-family: 'Cascadia Code', Consolas, monospace; }
.account-date { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.account-panel :deep(.ant-table-wrapper) { min-height: 0; flex: 1; overflow: auto; }
.account-panel :deep(.ant-table-thead > tr > th) { padding: 8px 6px; font-size: 12px; }
.account-panel :deep(.ant-table-tbody > tr > td) { padding: 8px 6px; font-size: 12px; }
.detail-heading { margin-bottom: 22px; }
.detail-heading h2 { margin: 0 0 12px; color: var(--ink); font-size: 18px; overflow-wrap: anywhere; }
.detail-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(128, 128, 128, .18); }
.detail-section-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.detail-section h3 { margin: 0; color: var(--ink); font-size: 14px; font-weight: 600; }
.detail-section p { margin: 6px 0 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
.credential-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 0; }
.credential-row strong { font-size: 13px; font-weight: 500; }
.credential-row p { font-size: 12px; }
@media (max-width: 600px) {
  .account-filters { padding: 14px; gap: 8px; }
  .account-search { max-width: none; flex-basis: 100%; }
  .account-filters :deep(.ant-select) { flex: 1 1 calc(50% - 8px); min-width: 0; }
  .account-summary { padding-inline: 14px; }
}
</style>



