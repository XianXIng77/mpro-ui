<template>
  <div class="invite-page">
    <a-card class="invite-card" :body-style="{ padding: 0 }">
      <div class="invite-toolbar">
        <a-space :size="8" wrap>
          <a-button v-if="hasPermission('invite:create')" @click="openCreate">
            <template #icon><PlusOutlined /></template>新增
          </a-button>
          <a-button v-if="hasPermission('invite:update')" @click="editSelected">
            <template #icon><EditOutlined /></template>修改
          </a-button>
          <a-button v-if="hasPermission('invite:export')" :loading="exporting" @click="exportSelected">
            <template #icon><DownloadOutlined /></template>导出选中
          </a-button>
          <a-button v-if="hasPermission('invite:delete')" danger :loading="deleting" :disabled="destroyingCodes.length > 0" @click="confirmRemoveSelected">
            <template #icon><DeleteOutlined /></template>删除选中
          </a-button>
        </a-space>

        <a-space :size="8" class="toolbar-end">
          <a-input-search v-model:value="searchInput" allow-clear placeholder="搜索邀请码"
            class="code-search" @search="search" />
          <a-select :value="status" class="status-select" :options="statusOptions"
            aria-label="邀请码状态" @change="changeStatus" />
          <a-tooltip title="刷新列表">
            <a-button :loading="loading" aria-label="刷新列表" @click="loadCodes">
              <template #icon><ReloadOutlined /></template>
            </a-button>
          </a-tooltip>
        </a-space>
      </div>

      <div v-if="selectedKeys.length" class="selection-note">
        已选 {{ selectedKeys.length }} 条
        <a-button type="link" size="small" @click="selectedKeys = []">清空选择</a-button>
      </div>
      <a-alert v-if="listError" type="error" show-icon class="list-error" :message="listError" />

      <a-table row-key="code" :columns="columns" :data-source="codes" :loading="loading"
        :row-selection="rowSelection" :pagination="pagination" :scroll="{ x: 1008 }"
        :locale="{ emptyText: listError ? '列表加载失败' : '暂无邀请码，点击左上角“新增”生成' }"
        @change="onTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'">
            <code class="table-code" :class="{ banned: record.status === 'invalid' }">{{ record.code }}</code>
          </template>
          <template v-else-if="column.key === 'usage'">
            <span class="usage-count">{{ record.uses }}</span><span class="usage-total"> / {{ record.maxUses }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'lastUsedAt'">
            {{ formatDate(record.lastUsedAt) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="0" class="row-actions">
              <a-button type="link" size="small" @click="copyCode(record.code)">复制</a-button>
              <a-button v-if="hasPermission('invite:update')" type="link" size="small"
                :disabled="!record.enabled || destroyingCodes.includes(record.code)"
                @click="openEdit(record)">修改</a-button>
              <a-popconfirm v-if="hasPermission('invite:delete')" placement="topRight" title="确定销毁这个邀请码吗？销毁后将不可用，记录会保留。"
                ok-text="销毁" cancel-text="取消"
                :disabled="!record.enabled || saving || deleting || destroyingCodes.includes(record.code)"
                @confirm="destroy(record)">
                <a-button type="link" danger size="small"
                  :disabled="!record.enabled || saving || deleting"
                  :loading="destroyingCodes.includes(record.code)">销毁</a-button>
              </a-popconfirm>
              <a-popconfirm v-if="hasPermission('invite:delete')" placement="topRight" title="确定永久删除这个邀请码吗？此操作无法撤销。"
                ok-text="删除" cancel-text="取消" :disabled="destroyingCodes.includes(record.code)"
                @confirm="remove(record.code)">
                <a-button type="link" danger size="small"
                  :disabled="destroyingCodes.includes(record.code)">删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal v-if="hasPermission('invite:create')" :open="createOpen" title="新增邀请码" :width="520" :confirm-loading="generating"
      :ok-text="generatedCodes.length ? '继续生成' : '生成邀请码'"
      @ok="generate" @cancel="createOpen = false">
      <a-form layout="vertical">
        <a-form-item label="生成数量" extra="每次最多生成 50 个">
          <a-input-number :value="generateCount" :min="1" :max="50" :precision="0"
            class="number-input" @change="generateCount = Number($event)" />
        </a-form-item>
        <a-form-item label="每个可使用次数" extra="生成后可以单独修改，最多 1000 次">
          <a-input-number :value="generateMaxUses" :min="1" :max="1000" :precision="0"
            class="number-input" @change="generateMaxUses = Number($event)" />
        </a-form-item>
      </a-form>
      <div v-if="generatedCodes.length" class="generated-result">
        <div class="generated-heading">
          <strong>本次生成 {{ generatedCodes.length }} 个</strong>
          <a-button type="link" size="small" @click="copyAllGenerated">复制全部</a-button>
        </div>
        <div class="generated-list">
          <div v-for="item in generatedCodes" :key="item.code" class="generated-item">
            <code>{{ item.code }}</code>
            <a-button type="link" size="small" @click="copyCode(item.code)">复制</a-button>
          </div>
        </div>
      </div>
    </a-modal>

    <a-drawer v-if="hasPermission('invite:update')" v-model:open="editOpen" title="修改邀请码" width="min(440px, 100vw)" placement="right">
      <template v-if="editTarget">
        <a-descriptions :column="1" size="small" bordered class="edit-details">
          <a-descriptions-item label="邀请码">{{ editTarget.code }}</a-descriptions-item>
          <a-descriptions-item label="已使用">{{ editTarget.uses }} 次</a-descriptions-item>
          <a-descriptions-item label="当前额度">{{ editTarget.maxUses }} 次</a-descriptions-item>
        </a-descriptions>
        <a-form layout="vertical">
          <a-form-item label="可使用次数" extra="不能小于已使用次数，最多 1000 次">
            <a-input-number :value="editMaxUses" :min="Math.max(1, editTarget.uses)"
              :max="1000" :precision="0" class="number-input"
              @change="editMaxUses = Number($event)" />
          </a-form-item>
        </a-form>
      </template>
      <template #footer>
        <div class="drawer-footer">
          <a-button @click="editOpen = false">取消</a-button>
          <a-button type="primary" :loading="saving" @click="saveEdit">保存修改</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { hasPermission } from '@/utils/access'
import { inviteCodeApi, InviteCode, InviteStatus } from '@/api/invite-code'
import {
  Alert, Button, Card, Descriptions, Drawer, Form, InputNumber, InputSearch,
  message, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip
} from 'ant-design-vue'
import {
  DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined
} from '@ant-design/icons-vue'

const columns = [
  { title: '邀请码', dataIndex: 'code', key: 'code', width: 195, align: 'center' as const },
  { title: '使用情况', key: 'usage', width: 115, align: 'center' as const },
  { title: '状态', key: 'status', width: 90, align: 'center' as const },
  { title: '创建时间', key: 'createdAt', width: 175, align: 'center' as const },
  { title: '最近使用', key: 'lastUsedAt', width: 175, align: 'center' as const },
  { title: '操作', key: 'actions', width: 224, align: 'center' as const }
]
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'valid', label: '有效' },
  { value: 'used', label: '已用完' },
  { value: 'invalid', label: '不可用' }
]

export default defineComponent({
  name: 'InviteCodePage',
  components: {
    AAlert: Alert,
    AButton: Button,
    ACard: Card,
    ADescriptions: Descriptions,
    ADescriptionsItem: Descriptions.Item,
    ADrawer: Drawer,
    AForm: Form,
    AFormItem: Form.Item,
    AInputNumber: InputNumber,
    AInputSearch: InputSearch,
    AModal: Modal,
    APopconfirm: Popconfirm,
    ASelect: Select,
    ASpace: Space,
    ATable: Table,
    ATag: Tag,
    ATooltip: Tooltip,
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    PlusOutlined,
    ReloadOutlined
  },
  data() {
    return {
      codes: [] as InviteCode[],
      generatedCodes: [] as InviteCode[],
      selectedKeys: [] as string[],
      generateCount: 1,
      generateMaxUses: 1,
      searchInput: '',
      keyword: '',
      status: '',
      pageNum: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      generating: false,
      deleting: false,
      destroyingCodes: [] as string[],
      exporting: false,
      saving: false,
      createOpen: false,
      editOpen: false,
      editTarget: null as InviteCode | null,
      editMaxUses: 1,
      listError: '',
      columns,
      statusOptions
    }
  },
  computed: {
    pagination(): { current: number; pageSize: number; total: number; showSizeChanger: boolean; pageSizeOptions: string[] } {
      return {
        current: this.pageNum,
        pageSize: this.pageSize,
        total: this.total,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50']
      }
    },
    rowSelection(): { selectedRowKeys: string[]; onChange: (keys: Array<string | number>) => void } {
      return {
        selectedRowKeys: this.selectedKeys,
        onChange: (keys: Array<string | number>) => { this.selectedKeys = keys.map(String) }
      }
    }
  },
  mounted() {
    this.loadCodes()
  },
  methods: {
    hasPermission,
    async loadCodes() {
      this.loading = true
      this.listError = ''
      try {
        const result = await inviteCodeApi.list({
          pageNum: this.pageNum, pageSize: this.pageSize,
          keyword: this.keyword || undefined, status: this.status || undefined
        })
        this.codes = result.rows || []
        this.total = result.total || 0
        this.selectedKeys = []
        if (this.pageNum > 1 && !this.codes.length && this.total > 0) {
          this.pageNum = Math.ceil(this.total / this.pageSize)
          await this.loadCodes()
        }
      } catch (error) {
        this.listError = error instanceof Error ? error.message : '邀请码列表加载失败'
      } finally {
        this.loading = false
      }
    },
    openCreate() {
      this.generatedCodes = []
      this.createOpen = true
    },
    async generate() {
      if (!Number.isInteger(this.generateCount) || this.generateCount < 1 || this.generateCount > 50 ||
          !Number.isInteger(this.generateMaxUses) || this.generateMaxUses < 1 || this.generateMaxUses > 1000) {
        message.error('请填写有效的生成数量和使用次数')
        return
      }
      this.generating = true
      try {
        this.generatedCodes = await inviteCodeApi.generate(this.generateCount, this.generateMaxUses)
        message.success('已生成 ' + this.generatedCodes.length + ' 个邀请码')
        this.pageNum = 1
        await this.loadCodes()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '邀请码生成失败')
      } finally {
        this.generating = false
      }
    },
    search() {
      this.keyword = this.searchInput.trim()
      this.pageNum = 1
      this.loadCodes()
    },
    changeStatus(value: string) {
      this.status = value
      this.pageNum = 1
      this.loadCodes()
    },
    onTableChange(pagination: { current?: number; pageSize?: number }) {
      this.pageNum = pagination.current || 1
      this.pageSize = pagination.pageSize || 10
      this.loadCodes()
    },
    statusLabel(status: InviteStatus) {
      return status === 'valid' ? '有效' : status === 'used' ? '已用完' : '不可用'
    },
    statusColor(status: InviteStatus) {
      return status === 'valid' ? 'green' : status === 'used' ? 'gold' : 'default'
    },
    formatDate(value?: string | null) {
      if (!value) return '—'
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('zh-CN', { hour12: false })
    },
    async copyText(value: string, success: string) {
      try {
        await navigator.clipboard.writeText(value)
        message.success(success)
      } catch {
        message.error('复制失败，请检查浏览器剪贴板权限')
      }
    },
    copyCode(code: string) {
      this.copyText(code, '邀请码已复制')
    },
    copyAllGenerated() {
      this.copyText(this.generatedCodes.map(item => item.code).join('\n'), '本次生成的邀请码已复制')
    },
    async exportSelected() {
      if (!this.selectedKeys.length) {
        message.warning('请先勾选要导出的邀请码')
        return
      }
      this.exporting = true
      try {
        const codes = await inviteCodeApi.export(this.selectedKeys)
        if (!codes.length) {
          message.warning('选中的邀请码已不存在')
          return
        }
        const blob = new Blob([codes.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'invite-codes-' + new Date().toISOString().slice(0, 10) + '.txt'
        link.click()
        URL.revokeObjectURL(url)
        message.success('已导出 ' + codes.length + ' 个邀请码')
      } catch (error) {
        message.error(error instanceof Error ? error.message : '邀请码导出失败')
      } finally {
        this.exporting = false
      }
    },
    editSelected() {
      if (!this.selectedKeys.length) {
        message.warning('请先勾选要修改的邀请码')
        return
      }
      if (this.selectedKeys.length !== 1) {
        message.warning('修改时只能选择一个邀请码')
        return
      }
      const item = this.codes.find(record => record.code === this.selectedKeys[0])
      if (!item) {
        message.warning('选中的邀请码已不存在，请刷新后重试')
        return
      }
      if (item.status === 'invalid') {
        message.warning('不可用的邀请码不能修改')
        return
      }
      this.openEdit(item)
    },
    openEdit(item: InviteCode) {
      if (!item.enabled || this.destroyingCodes.includes(item.code)) return
      this.editTarget = item
      this.editMaxUses = item.maxUses
      this.editOpen = true
    },
    async saveEdit() {
      if (!this.editTarget || !Number.isInteger(this.editMaxUses) ||
          this.editMaxUses < Math.max(1, this.editTarget.uses) || this.editMaxUses > 1000) {
        message.error('使用次数必须在已使用次数与 1000 之间')
        return
      }
      this.saving = true
      try {
        await inviteCodeApi.update(this.editTarget.code, { maxUses: this.editMaxUses })
        this.editOpen = false
        message.success('使用次数已更新')
        await this.loadCodes()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '修改失败')
      } finally {
        this.saving = false
      }
    },
    async destroy(item: InviteCode) {
      if (!item.enabled || this.saving || this.deleting || this.destroyingCodes.includes(item.code)) return
      this.destroyingCodes.push(item.code)
      try {
        const updated = await inviteCodeApi.update(item.code, { enabled: false })
        this.codes = this.codes.map(code => code.code === updated.code ? updated : code)
        if (this.editTarget?.code === item.code) {
          this.editOpen = false
          this.editTarget = null
        }
        message.success('邀请码已销毁，现已不可用')
        await this.loadCodes()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '销毁失败，请重试')
      } finally {
        this.destroyingCodes = this.destroyingCodes.filter(code => code !== item.code)
      }
    },
    async remove(code: string) {
      try {
        await inviteCodeApi.remove(code)
        message.success('邀请码已删除')
        await this.loadCodes()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '删除失败')
      }
    },
    confirmRemoveSelected() {
      if (!this.selectedKeys.length) {
        message.warning('请先勾选要删除的邀请码')
        return
      }
      Modal.confirm({
        title: '确定永久删除选中的 ' + this.selectedKeys.length + ' 个邀请码吗？',
        content: '此操作无法撤销。',
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => this.removeSelected()
      })
    },
    async removeSelected() {
      const codes = [...this.selectedKeys]
      if (!codes.length) return
      this.deleting = true
      try {
        const results = await Promise.allSettled(codes.map(code => inviteCodeApi.remove(code)))
        const succeeded = results.filter(result => result.status === 'fulfilled').length
        const failed = codes.length - succeeded
        if (succeeded) message.success('已删除 ' + succeeded + ' 个邀请码')
        if (failed) message.error(failed + ' 个邀请码删除失败，请刷新后重试')
        await this.loadCodes()
      } finally {
        this.deleting = false
      }
    }
  }
})
</script>

<style scoped>
.invite-page { width: 100%; min-height: 100%; padding: 16px 28px 28px; }
.invite-card { width: 100%; border-radius: 12px; overflow: hidden; }
.invite-toolbar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
  gap: 12px; padding: 18px 20px;
}
.toolbar-end { margin-left: auto; }
.code-search { width: 230px; }
.status-select { width: 126px; }
.selection-note { padding: 0 20px 12px; color: #64748b; font-size: 13px; }
.list-error { margin: 0 20px 14px; }
.table-code { font-family: Consolas, 'Courier New', monospace; font-size: 13px; font-weight: 700; letter-spacing: .04em; }
.table-code.banned { color: #94a3b8; text-decoration: line-through; }
.row-actions { white-space: nowrap; }
.usage-count { font-weight: 600; font-variant-numeric: tabular-nums; }
.usage-total { color: #94a3b8; font-variant-numeric: tabular-nums; }
.number-input { width: 100%; }
.generated-result { margin-top: 26px; border-top: 1px solid #eef0f3; padding-top: 20px; }
.generated-heading, .generated-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.generated-list { max-height: 320px; overflow-y: auto; margin-top: 10px; }
.generated-item { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
.generated-item code { font-family: Consolas, 'Courier New', monospace; overflow-wrap: anywhere; }
.drawer-footer { display: flex; justify-content: flex-end; gap: 8px; }
.edit-details { margin-bottom: 24px; }
:deep(.invite-card .ant-table-thead > tr > th) { background: #fafbfd; color: #64748b; font-weight: 600; text-align: center; }
:deep(.invite-card .ant-table-cell .ant-tag) { margin-inline-end: 0; }
:deep(.invite-card .ant-pagination) { padding: 0 20px; }
@media (max-width: 750px) {
  .invite-page { padding: 14px 12px 28px; }
  .invite-toolbar { padding: 14px; }
  .toolbar-end { width: 100%; margin-left: 0; }
  .code-search { flex: 1; min-width: 0; }
  .selection-note { padding: 0 14px 12px; }
}

</style>
