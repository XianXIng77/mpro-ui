<template>
  <workspace-page>
    <a-card class="workspace-card audit-card" :body-style="{ padding: 0 }">
      <div class="workspace-toolbar audit-toolbar">
        <a-space :size="8" wrap class="audit-filters">
          <a-button v-if="hasPermission('audit:export')" :disabled="!total || loading" :loading="exporting" @click="exportLogs"><template #icon><DownloadOutlined /></template>导出结果</a-button>
          <a-select id="audit-action" v-model:value="actionFilter" aria-label="操作类型" class="audit-select" :options="actionOptions" @change="resetPage" />
          <a-select id="audit-status" v-model:value="statusFilter" aria-label="操作状态" class="audit-select" :options="statusOptions" @change="resetPage" />
          <a-button @click="resetFilters">重置</a-button>
        </a-space>
        <label class="sr-only" for="audit-action">操作类型</label><label class="sr-only" for="audit-status">操作状态</label>
        <div class="toolbar-end">
          <a-input-search v-model:value="queryInput" class="workspace-search" placeholder="搜索用户、详情或 IP" aria-label="搜索审计记录" allow-clear @search="search" />
          <a-tooltip title="刷新列表"><a-button :loading="loading" aria-label="刷新审计列表" @click="refresh"><template #icon><ReloadOutlined /></template></a-button></a-tooltip>
        </div>
      </div>
      <a-alert v-if="listError" type="error" show-icon :message="listError">
        <template #action><a-button size="small" :loading="loading" @click="loadLogs">重试</a-button></template>
      </a-alert>
      <a-table row-key="id" :columns="columns" :data-source="logs" :loading="loading" :pagination="pagination"
        :scroll="{ x: 1270 }" @change="changePage">
        <template #emptyText><a-empty :image="emptyImage" description="没有匹配的操作记录"><a-button type="link" @click="resetFilters">重置筛选</a-button></a-empty></template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'time'">
            <span class="event-time">{{ record.time }}</span>
          </template>
          <template v-else-if="column.key === 'event'">{{ record.action }}</template>
          <template v-else-if="column.key === 'detail'">
            <a-tooltip :title="record.module + ' · ' + record.detail">
              <span class="audit-ellipsis" tabindex="0">{{ record.module }} · {{ record.detail }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'user'">
            <a-tooltip :title="record.email"><span class="audit-ellipsis" tabindex="0">{{ record.user }}</span></a-tooltip>
          </template>
          <template v-else-if="column.key === 'source'">
            <a-tooltip :title="record.country + ' · ' + record.location">
              <span class="event-ip" tabindex="0">{{ record.ip }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'device'">
            <a-tooltip :title="record.device"><span class="audit-ellipsis" tabindex="0">{{ record.device }}</span></a-tooltip>
          </template>
          <template v-else-if="column.key === 'result'">
            <a-tag :color="record.status === '成功' ? 'success' : 'error'">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'risk'">
            <a-tag v-if="record.risk !== '普通'" :color="record.risk === '高风险' ? 'error' : 'warning'">{{ record.risk }}</a-tag>
            <span v-else class="muted">{{ record.risk }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button type="link" size="small" @click="openDetail(record)">
              <template #icon><FileSearchOutlined /></template>查看详情
            </a-button>
          </template>
        </template>
      </a-table>
      <div class="audit-summary" aria-label="当前筛选统计">
        <span>今日操作 <strong>{{ summary.today }}</strong></span>
        <span>活跃用户 <strong>{{ summary.users }}</strong></span>
        <span>成功操作 <strong>{{ summary.success }}</strong></span>
        <span>高风险事件 <strong class="risk-count">{{ summary.risks }}</strong></span>
      </div>
    </a-card>
    <a-drawer v-model:open="detailOpen" title="操作详情" width="min(440px, 100vw)" :body-style="{ padding: '24px' }">
      <a-spin v-if="detailLoading" tip="正在加载详情…" />
      <a-alert v-else-if="detailError" type="error" show-icon :message="detailError">
        <template #action><a-button size="small" @click="loadDetail">重试</a-button></template>
      </a-alert>
      <a-typography v-else-if="activeLog" class="audit-record">
        <div class="record-heading">
          <h2>{{ activeLog.action }}</h2>
          <a-space :size="6"><a-tag :color="activeLog.status === '成功' ? 'success' : 'error'">{{ activeLog.status }}</a-tag><a-tag :color="activeLog.risk === '高风险' ? 'error' : activeLog.risk === '关注' ? 'warning' : undefined">{{ activeLog.risk }}</a-tag></a-space>
        </div>
        <a-typography-text type="secondary" class="record-time"><ClockCircleOutlined aria-hidden="true" />{{ activeLog.time }}</a-typography-text>
        <section class="record-content" aria-labelledby="record-content-title">
          <h3 id="record-content-title">{{ activeLog.module }}</h3>
          <a-typography-paragraph class="record-description">{{ activeLog.detail }}</a-typography-paragraph>
        </section>
        <a-divider />
        <section aria-labelledby="record-user-title">
          <h3 id="record-user-title" class="record-section-title">操作用户</h3>
          <div class="record-user"><a-avatar :size="40"><template #icon><UserOutlined /></template></a-avatar><div><strong>{{ activeLog.user }}</strong><a-typography-text type="secondary" class="record-email">{{ activeLog.email }}</a-typography-text></div></div>
        </section>
        <a-divider />
        <section aria-labelledby="record-source-title">
          <h3 id="record-source-title" class="record-section-title">来源与设备</h3>
          <a-descriptions layout="vertical" size="small" :column="2" :colon="false" class="record-source">
            <a-descriptions-item label="IP 地址">{{ activeLog.ip }}</a-descriptions-item>
            <a-descriptions-item label="地理位置"><span class="record-inline"><EnvironmentOutlined aria-hidden="true" />{{ activeLog.country }} · {{ activeLog.location }}</span></a-descriptions-item>
            <a-descriptions-item label="网络">{{ activeLog.isp }}</a-descriptions-item>
            <a-descriptions-item label="时区">{{ activeLog.timezone }}</a-descriptions-item>
            <a-descriptions-item label="设备" :span="2"><span class="record-inline"><DesktopOutlined aria-hidden="true" />{{ activeLog.device }}</span></a-descriptions-item>
          </a-descriptions>
        </section>
        <a-divider />
        <footer class="record-reference"><a-typography-text type="secondary">记录编号</a-typography-text><a-typography-paragraph :copyable="{ text: activeLog.id, tooltips: ['复制编号', '已复制'] }">{{ activeLog.id }}</a-typography-paragraph></footer>
      </a-typography>
    </a-drawer>
  </workspace-page>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { hasPermission } from '@/utils/access'
import { Alert, Spin, Avatar, Typography, Button, Card, Descriptions, Divider, Empty, Input, Drawer, Select, Space, Table, Tag, Tooltip, message } from 'ant-design-vue'
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue'
import { DownloadOutlined, FileSearchOutlined, ReloadOutlined, EnvironmentOutlined, DesktopOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons-vue'
import WorkspacePage from '@/components/WorkspacePage.vue'
import { AUDIT_ACTIONS } from '@/constants/access'
import { operationAuditApi } from '@/api/operation-audit'
import type { OperationAuditQuery, OperationAuditSummary } from '@/api/operation-audit'
import type { AuditRecord } from '@/types/workspace'

const columns: TableColumnsType = [
  { title: '发生时间', key: 'time', width: 180, align: 'center' },
  { title: '操作者', key: 'user', width: 110, align: 'center' },
  { title: '操作事件', key: 'event', width: 130, align: 'center' },
  { title: '操作详情', key: 'detail', width: 240, align: 'center', ellipsis: true },
  { title: 'IP 地址', key: 'source', width: 145, align: 'center' },
  { title: '设备', key: 'device', width: 175, align: 'center', ellipsis: true },
  { title: '执行结果', key: 'result', width: 85, align: 'center' },
  { title: '风险等级', key: 'risk', width: 85, align: 'center' },
  { title: '操作', key: 'actions', width: 120, align: 'center', fixed: 'right' }
]
export default defineComponent({
  name: 'OperationAuditPage',
  components: {
    WorkspacePage, AAlert: Alert, ASpin: Spin, AAvatar: Avatar,
    ATypography: Typography, ATypographyText: Typography.Text, ATypographyParagraph: Typography.Paragraph,
    AButton: Button, ACard: Card, ADescriptions: Descriptions, ADescriptionsItem: Descriptions.Item,
    ADivider: Divider, AEmpty: Empty, AInputSearch: Input.Search, ADrawer: Drawer,
    ASelect: Select, ASpace: Space, ATable: Table, ATag: Tag, ATooltip: Tooltip,
    DownloadOutlined, FileSearchOutlined, ReloadOutlined, EnvironmentOutlined,
    DesktopOutlined, ClockCircleOutlined, UserOutlined
  },
  data() {
    return {
      columns,
      emptyImage: Empty.PRESENTED_IMAGE_SIMPLE,
      queryInput: '',
      query: '',
      actionFilter: '',
      statusFilter: '',
      pageNum: 1,
      pageSize: 10,
      logs: [] as AuditRecord[],
      total: 0,
      summary: { today: 0, users: 0, success: 0, risks: 0 } as OperationAuditSummary,
      loading: false,
      listError: '',
      listRequestId: 0,
      detailOpen: false,
      activeLog: null as AuditRecord | null,
      detailError: '',
      detailLoading: false,
      detailId: '',
      detailRequestId: 0,
      exporting: false,
      actionOptions: [{ value: '', label: '全部操作' }, ...AUDIT_ACTIONS.map(value => ({ value, label: value }))],
      statusOptions: [
        { value: '', label: '全部状态' },
        { value: '成功', label: '成功' },
        { value: '失败', label: '失败' }
      ]
    }
  },
  computed: {
    pagination(): TablePaginationConfig {
      return {
        current: this.pageNum, pageSize: this.pageSize, total: this.total,
        showSizeChanger: true, pageSizeOptions: ['10', '20', '50'],
        showTotal: total => `共 ${total} 条`
      }
    }
  },
  watch: {
    queryInput(value: string) {
      if (!value && this.query) this.search()
    },
    detailOpen(open: boolean) {
      if (!open) {
        this.detailRequestId += 1
        this.activeLog = null
      }
    }
  },
  mounted() {
    this.loadLogs()
  },
  beforeUnmount() {
    this.listRequestId += 1
    this.detailRequestId += 1
  },
  methods: {
    hasPermission,
    filters(): OperationAuditQuery {
      return {
        keyword: this.query || undefined,
        action: this.actionFilter || undefined,
        status: this.statusFilter || undefined
      }
    },
    search() {
      this.query = this.queryInput.trim().toLowerCase()
      this.resetPage()
    },
    resetPage() {
      this.pageNum = 1
      this.loadLogs()
    },
    resetFilters() {
      this.queryInput = ''
      this.query = ''
      this.actionFilter = ''
      this.statusFilter = ''
      this.resetPage()
    },
    changePage(page: TablePaginationConfig) {
      this.pageNum = page.pageSize !== this.pageSize ? 1 : page.current || 1
      this.pageSize = page.pageSize || 10
      this.loadLogs()
    },
    refresh() {
      this.loadLogs()
    },
    openDetail(log: AuditRecord) {
      this.detailId = log.id
      this.detailOpen = true
      this.loadDetail()
    },
    async loadLogs() {
      const requestId = ++this.listRequestId
      this.loading = true
      this.listError = ''
      const filters = this.filters()
      try {
        const [page, summary] = await Promise.all([
          operationAuditApi.list({ ...filters, pageNum: this.pageNum, pageSize: this.pageSize }),
          operationAuditApi.summary(filters)
        ])
        if (requestId !== this.listRequestId) return
        this.logs = page.rows
        this.total = page.total
        this.summary = summary
        const lastPage = Math.max(1, Math.ceil(page.total / this.pageSize))
        if (this.pageNum > lastPage) {
          this.pageNum = lastPage
          this.loadLogs()
        }
      } catch (error) {
        if (requestId !== this.listRequestId) return
        this.logs = []
        this.total = 0
        this.summary = { today: 0, users: 0, success: 0, risks: 0 }
        this.listError = error instanceof Error ? error.message : '操作审计加载失败'
      } finally {
        if (requestId === this.listRequestId) this.loading = false
      }
    },
    async loadDetail() {
      const requestId = ++this.detailRequestId
      this.detailLoading = true
      this.detailError = ''
      this.activeLog = null
      try {
        const detail = await operationAuditApi.detail(this.detailId)
        if (requestId === this.detailRequestId) this.activeLog = detail
      } catch (error) {
        if (requestId === this.detailRequestId) this.detailError = error instanceof Error ? error.message : '详情加载失败'
      } finally {
        if (requestId === this.detailRequestId) this.detailLoading = false
      }
    },
    async exportLogs() {
      if (this.exporting) return
      this.exporting = true
      try {
        const blob = await operationAuditApi.export(this.filters())
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'operation-audit.csv'
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        message.success('已导出筛选结果')
        this.loadLogs()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '导出失败')
      } finally {
        this.exporting = false
      }
    }
  }
})
</script>
<style scoped>
.audit-select { width: 160px; }
.audit-toolbar .workspace-search { width: 220px; }
.audit-card :deep(.ant-table-thead > tr > th) { color: #475569; }
[data-theme="dark"] .audit-card :deep(.ant-table-thead > tr > th) { color: var(--muted); }
.audit-card :deep(.ant-table-cell) { white-space: nowrap; }
.audit-card :deep(td.ant-table-cell-fix-right) { background: var(--surface); transition: none; }
.audit-card :deep(.ant-table-tbody > tr:hover > td.ant-table-cell-fix-right) { background: var(--subtle); }
.audit-ellipsis { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-time, .event-ip { font-variant-numeric: tabular-nums; white-space: nowrap; }
.audit-ellipsis:focus-visible, .event-ip:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.audit-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; padding: 12px 20px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; }
.audit-summary strong { color: var(--ink); margin-left: 8px; font-weight: 500; font-variant-numeric: tabular-nums; }
.audit-summary .risk-count { color: #cf1322; }
.risk-count { color: #cf1322; }
.audit-record { overflow-wrap: anywhere; }
.record-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.record-heading h2 { margin: 0; font-size: 24px; line-height: 1.4; font-weight: 600; color: inherit; }
.record-heading :deep(.ant-tag) { margin-inline-end: 0; }
.record-time { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 13px; font-variant-numeric: tabular-nums; }
.record-content { margin-top: 28px; }
.record-content h3 { margin: 0 0 10px; font-size: 15px; font-weight: 600; color: inherit; }
.record-description { line-height: 1.85; white-space: pre-wrap; margin-bottom: 0; }
.record-section-title { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: inherit; }
.record-user { display: flex; align-items: center; gap: 12px; }
.record-user > div { min-width: 0; }
.record-user :deep(.ant-avatar) { flex-shrink: 0; }
.record-email { display: block; margin-top: 4px; font-size: 13px; }
.record-inline { display: inline-flex; align-items: center; gap: 8px; }
.record-inline .anticon { flex-shrink: 0; }
.record-source :deep(.ant-descriptions-item) { padding-bottom: 16px; }
.record-source :deep(.ant-descriptions-item-label) { font-size: 12px; }
.record-reference { font-size: 12px; }
.record-reference > :last-child { margin: 8px 0 0; font-size: 12px; }
@media (max-width: 900px) {
  .audit-toolbar .workspace-search { width: 100%; }
}
@media (max-width: 600px) {
  .audit-filters { width: 100%; }
  .audit-filters :deep(.ant-space-item) { flex: 1 1 calc(50% - 8px); min-width: 0; }
  .audit-select, .audit-filters :deep(.ant-btn) { width: 100%; }
  .audit-summary { padding-inline: 14px; gap: 8px 16px; }
  .record-heading h2 { font-size: 22px; }
}
</style>
