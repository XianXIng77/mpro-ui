<template>
  <a-config-provider :locale="locale">
    <div class="register-logs-page">
      <a-card class="logs-card" :body-style="{ padding: 0 }">
        <div class="logs-toolbar">
          <label class="sr-only" for="log-target">注册目标</label>
          <label class="sr-only" for="log-outcome">结果</label>
          <a-space :size="8" wrap class="filter-controls">
            <a-select id="log-target" v-model:value="targetFilter" class="target-select"
              aria-label="注册目标" :options="targetOptions" @change="resetPage" />
            <a-select id="log-outcome" v-model:value="outcomeFilter" class="outcome-select"
              aria-label="结果" :options="outcomeOptions" @change="resetPage" />
            <a-button @click="resetFilters">重置</a-button>
          </a-space>
          <a-space :size="8" class="toolbar-end">
            <a-input-search v-model:value="emailInput" class="logs-search" allow-clear
              placeholder="输入邮箱关键词" aria-label="搜索邮箱" @search="search" />
            <a-tooltip title="刷新列表">
              <a-button :loading="loading" aria-label="刷新列表" @click="refresh">
                <template #icon><ReloadOutlined /></template>
              </a-button>
            </a-tooltip>
          </a-space>
        </div>

        <a-alert v-if="listError" class="list-error" type="error" show-icon :message="listError">
          <template #action><a-button size="small" :loading="loading" @click="loadLogs">重试</a-button></template>
        </a-alert>
        <a-table row-key="id" :columns="columns" :data-source="logs" :loading="loading"
          :pagination="pagination" :scroll="{ x: 960 }" @change="onTableChange">
          <template #emptyText>
            <a-empty :image="emptyImage" :description="listError ? '日志加载失败' : '暂无符合条件的日志'">
              <a-button v-if="!listError" type="link" @click="resetFilters">重置筛选</a-button>
            </a-empty>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'time'">
              <span class="event-time">{{ record.time }}</span>
            </template>
            <template v-else-if="column.key === 'email'">
              <span class="event-email">{{ record.email }}</span>
            </template>
            <template v-else-if="column.key === 'target'">{{ targetLabel(record.registrationTarget) }}</template>
            <template v-else-if="column.key === 'outcome'">
              <a-tag :color="outcomeColor(record.outcome)">{{ outcomeLabel(record.outcome) }}</a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="openLog(record)">
                <template #icon><FileTextOutlined /></template>查看日志
              </a-button>
            </template>
          </template>
        </a-table>
      </a-card>

      <a-modal v-model:open="detailOpen" title="注册日志详情" :footer="null" width="min(1200px, calc(100vw - 48px))" centered
        :body-style="{ maxHeight: '78vh', overflow: 'auto' }" :destroy-on-close="true">
        <div v-if="detailLoading" class="detail-loading"><a-spin tip="正在加载日志…" /></div>
        <a-alert v-else-if="detailError" type="error" show-icon :message="detailError">
          <template #action><a-button size="small" @click="loadDetail">重试</a-button></template>
        </a-alert>
        <template v-else-if="activeLog">
          <a-descriptions class="log-meta" size="small" :column="{ xs: 1, sm: 2 }">
            <a-descriptions-item label="邮箱">{{ activeLog.email }}</a-descriptions-item>
            <a-descriptions-item label="记录时间">{{ activeLog.time }}</a-descriptions-item>
            <a-descriptions-item label="注册目标">{{ targetLabel(activeLog.registrationTarget) }}</a-descriptions-item>
            <a-descriptions-item label="结果">
              <a-tag :color="outcomeColor(activeLog.outcome)">{{ outcomeLabel(activeLog.outcome) }}</a-tag>
            </a-descriptions-item>
          </a-descriptions>
          <div class="log-detail-grid">
            <section class="log-section" aria-label="日志内容">
              <h3>日志内容</h3>
              <pre tabindex="0">{{ activeLog.logText }}</pre>
            </section>
            <section class="screenshot-section" aria-label="事件截图">
              <h3>事件截图</h3>
              <a-image v-if="activeLog.screenshot" :src="activeLog.screenshot"
                :alt="activeLog.email + ' 的事件截图'" :preview="{ mask: '预览截图' }" :width="'100%'" />
              <div v-else class="screenshot-empty">
                <a-empty :image="emptyImage" description="该记录暂无截图" />
              </div>
            </section>
          </div>
        </template>
      </a-modal>
    </div>
  </a-config-provider>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Alert, Button, Card, ConfigProvider, Descriptions, Empty, Image, Input, Modal, Select, Space, Spin, Table, Tag, Tooltip } from 'ant-design-vue'
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { FileTextOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { REGISTRATION_OUTCOMES, REGISTRATION_TARGETS } from '@/constants/registration-log'
import { registrationLogApi } from '@/api/registration-log'
import type { RegistrationLog, RegistrationLogSummary } from '@/types/registration-log'

const columns: TableColumnsType = [
  { title: '记录时间', key: 'time', width: 200, align: 'center' },
  { title: '邮箱', key: 'email', width: 280, align: 'center' },
  { title: '注册目标', key: 'target', width: 180, align: 'center' },
  { title: '结果', key: 'outcome', width: 160, align: 'center' },
  { title: '操作', key: 'actions', width: 140, align: 'center', fixed: 'right' }
]

export default defineComponent({
  name: 'RegisterLogsPage',
  components: {
    AAlert: Alert, ASpin: Spin, AButton: Button, ACard: Card, AConfigProvider: ConfigProvider,
    ADescriptions: Descriptions, ADescriptionsItem: Descriptions.Item,
    AEmpty: Empty, AImage: Image, AInputSearch: Input.Search, AModal: Modal,
    ASelect: Select, ASpace: Space, ATable: Table, ATag: Tag, ATooltip: Tooltip,
    FileTextOutlined, ReloadOutlined
  },
  data() {
    return {
      locale: zhCN,
      emptyImage: Empty.PRESENTED_IMAGE_SIMPLE,
      columns,
      logs: [] as RegistrationLogSummary[],
      total: 0,
      listError: '',
      listRequestId: 0,
      emailInput: '',
      keyword: '',
      targetFilter: '',
      outcomeFilter: '',
      pageNum: 1,
      pageSize: 10,
      loading: false,
      detailOpen: false,
      activeLog: null as RegistrationLog | null,
      detailLoading: false,
      detailError: '',
      detailId: '',
      detailRequestId: 0,
      targetOptions: [{ value: '', label: '全部目标' }, ...REGISTRATION_TARGETS],
      outcomeOptions: [
        { value: '', label: '全部结果' },
        ...Object.entries(REGISTRATION_OUTCOMES).map(([value, outcome]) => ({ value, label: outcome.label }))
      ]
    }
  },
  computed: {
    pagination(): TablePaginationConfig {
      return {
        current: this.pageNum, pageSize: this.pageSize, total: this.total,
        showSizeChanger: true, pageSizeOptions: ['10', '20', '50'],
        showTotal: (total: number) => `共 ${total} 条`
      }
    }
  },
  watch: {
    emailInput(value: string) {
      if (!value && this.keyword) this.search()
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
    targetLabel(value: string): string {
      return REGISTRATION_TARGETS.find(item => item.value === value)?.label || value
    },
    outcomeLabel(value: string): string {
      return REGISTRATION_OUTCOMES[value]?.label || value
    },
    outcomeColor(value: string): string | undefined {
      return REGISTRATION_OUTCOMES[value]?.color
    },
    resetPage() {
      this.pageNum = 1
      this.loadLogs()
    },
    search() {
      this.keyword = this.emailInput.trim().toLowerCase()
      this.resetPage()
    },
    resetFilters() {
      this.emailInput = ''
      this.keyword = ''
      this.targetFilter = ''
      this.outcomeFilter = ''
      this.resetPage()
    },
    onTableChange(pagination: TablePaginationConfig) {
      this.pageNum = pagination.pageSize !== this.pageSize ? 1 : pagination.current || 1
      this.pageSize = pagination.pageSize || 10
      this.loadLogs()
    },
    openLog(record: RegistrationLogSummary) {
      this.detailId = record.id
      this.detailOpen = true
      this.loadDetail()
    },
    refresh() {
      this.loadLogs()
    },
    async loadLogs() {
      const requestId = ++this.listRequestId
      this.loading = true
      this.listError = ''
      try {
        const page = await registrationLogApi.list({
          pageNum: this.pageNum,
          pageSize: this.pageSize,
          keyword: this.keyword || undefined,
          registrationTarget: this.targetFilter || undefined,
          outcome: this.outcomeFilter || undefined
        })
        if (requestId !== this.listRequestId) return
        this.logs = page.rows
        this.total = page.total
        const lastPage = Math.max(1, Math.ceil(page.total / this.pageSize))
        if (this.pageNum > lastPage) {
          this.pageNum = lastPage
          this.loadLogs()
        }
      } catch (error) {
        if (requestId !== this.listRequestId) return
        this.logs = []
        this.total = 0
        this.listError = error instanceof Error ? error.message : '日志加载失败，请稍后重试'
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
        const detail = await registrationLogApi.detail(this.detailId)
        if (requestId === this.detailRequestId) this.activeLog = detail
      } catch (error) {
        if (requestId === this.detailRequestId) {
          this.detailError = error instanceof Error ? error.message : '日志详情加载失败'
        }
      } finally {
        if (requestId === this.detailRequestId) this.detailLoading = false
      }
    }
  }
})
</script>

<style scoped>
.register-logs-page { padding: 16px 28px 28px; }
.logs-card { border-color: #e5e7eb; border-radius: 14px; overflow: hidden; }
.list-error { margin: 0 20px 16px; }
.detail-loading { min-height: 180px; display: flex; align-items: center; justify-content: center; }
.logs-toolbar { min-height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.toolbar-end { margin-left: auto; }
.logs-search { width: 220px; }
.target-select { width: 180px; }
.outcome-select { width: 160px; }
.event-time { font-variant-numeric: tabular-nums; white-space: nowrap; }
.event-email { overflow-wrap: anywhere; }
.log-meta { margin-bottom: 18px; }
.log-meta :deep(.ant-descriptions-item-content) { overflow-wrap: anywhere; }
.log-detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 20px; }
.log-detail-grid section { min-width: 0; }
.log-detail-grid h3 { margin: 0 0 12px; color: #262626; font-size: 14px; font-weight: 600; }
.log-section pre { max-height: 480px; margin: 0; padding: 16px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; background: #f8fafc; color: #334155; border: 1px solid #e5e7eb; border-radius: 8px; font-family: Consolas, 'Courier New', monospace; font-size: 14px; line-height: 1.9; }
.log-section pre:focus-visible { outline: 2px solid #1677ff; outline-offset: 2px; }
.screenshot-section :deep(.ant-image-img) { display: block; height: auto; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 8px; }
.screenshot-empty { min-height: 180px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; }
:deep(.logs-card .ant-table-thead > tr > th) { background: #f8fafc; color: #475569; font-weight: 600; text-align: center; }
:deep(.ant-tag) { margin-inline-end: 0; }
:deep(.ant-tag-success) { color: #237804; }
:deep(.ant-tag-warning) { color: #874d00; }
:deep(.ant-tag-cyan) { color: #006d75; }
:deep(.logs-card .ant-pagination) { padding-inline: 20px; }
@media (max-width: 900px) {
  .log-detail-grid { grid-template-columns: minmax(0, 1fr); }
  .register-logs-page { padding: 16px; }
  .logs-toolbar { flex-wrap: wrap; }
  .toolbar-end { width: 100%; margin-left: 0; }
  .toolbar-end :deep(.ant-space-item:first-child) { flex: 1; min-width: 0; }
  .logs-search { width: 100%; }
}
@media (max-width: 600px) {
  .filter-controls { width: 100%; }
  .filter-controls :deep(.ant-space-item) { flex: 1 1 100%; min-width: 0; }
  .target-select, .outcome-select { width: 100%; }
  .log-detail-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
