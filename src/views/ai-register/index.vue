<template>
  <workspace-page>
    <div class="registration-page">
    <div class="registration-layout">
      <div class="execution-area">
        <a-card class="workspace-card task-card" :body-style="{ padding: 0 }">
          <div class="panel-toolbar task-toolbar"><div class="panel-title"><div class="task-tabs" role="tablist" aria-label="账号面板"><a-button size="small" :type="accountTab === 'tasks' ? 'primary' : 'default'" role="tab" :aria-selected="accountTab === 'tasks'" @click="switchAccountTab('tasks')">账号任务</a-button><a-button size="small" :type="accountTab === 'accounts' ? 'primary' : 'default'" role="tab" :aria-selected="accountTab === 'accounts'" @click="switchAccountTab('accounts')">账号管理</a-button></div><a-badge v-if="accountTab === 'tasks'" :status="batchStatus" :text="batchLabel" /></div><a-space v-if="accountTab === 'tasks'" :size="8"><a-button v-if="canConfigure" size="small" :disabled="busy || tasksLoading" @click="openConfig"><template #icon><SettingOutlined /></template>注册配置</a-button><a-button v-if="runState === 'running'" size="small" @click="pause"><template #icon><PauseCircleOutlined /></template>暂停任务</a-button><a-button v-if="busy" danger size="small" @click="forceStop"><template #icon><StopOutlined /></template>强制停止</a-button><a-button v-if="runState !== 'running'" type="primary" size="small" :disabled="!tasks.length || tasksLoading" @click="start"><template #icon><PlayCircleOutlined /></template>{{ runState === 'paused' ? '继续注册' : runState === 'complete' ? '重新演示' : '开始注册' }}</a-button><a-button size="small" :disabled="runState === 'idle' || tasksLoading" @click="reset"><template #icon><ReloadOutlined /></template>重置</a-button></a-space></div>
          <template v-if="accountTab === 'tasks'">
          <div class="config-summary"><span><DatabaseOutlined /> {{ mailSourceLabel }} · {{ tasks.length }} 个账号 · {{ concurrency }} 路并发</span><span>{{ configSummary }}</span></div>
          <div class="batch-progress"><div class="progress-copy"><span>已完成 <strong>{{ finishedCount }}</strong><span class="muted"> / {{ tasks.length }}</span></span><div class="result-counts"><span><i class="status-dot success-dot" />成功 {{ successCount }}</span><span><i class="status-dot error-dot" />失败 {{ failedCount }}</span><span>等待 {{ waitingCount }}</span></div></div><a-progress :percent="progress" :show-info="false" :stroke-width="5" :status="runState === 'running' ? 'active' : 'normal'" /></div>
          <a-table size="middle" row-key="id" :columns="columns" :data-source="tasks" :loading="tasksLoading" :pagination="false" :scroll="{ x: 575 }" :locale="{ emptyText: accountsLoaded ? '暂无未注册邮箱，请补充邮箱后重新保存配置' : '保存注册配置后加载待注册账号' }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'email'"><span class="task-email">{{ record.email }}</span></template>
              <template v-else-if="column.key === 'status'"><a-tag :color="record.status === 'running' && runState === 'paused' ? 'warning' : taskStates[record.status].color"><template v-if="record.status === 'running' && runState === 'running'" #icon><LoadingOutlined /></template>{{ record.status === 'running' && runState === 'paused' ? '已暂停' : taskStates[record.status].label }}</a-tag></template>
              <template v-else-if="column.key === 'step'"><span :class="{ 'failure-text': record.status === 'error', muted: record.status === 'waiting' }">{{ stageLabel(record) }}</span></template>
              <template v-else-if="column.key === 'elapsed'"><span class="elapsed">{{ record.elapsed ? record.elapsed + ' 秒' : '—' }}</span></template>
              <template v-else-if="column.key === 'actions'"><a-button v-if="record.status === 'error'" type="link" size="small" @click="retry(record)">重试</a-button><a-button type="link" size="small" :aria-label="'查看 ' + record.email + ' 的日志'" @click="showLogs(record)">日志</a-button></template>
            </template>
          </a-table>
          </template>
          <account-management-panel v-else embedded />
        </a-card>

        <div class="monitor-area">
        <section class="browser-panel" :aria-label="config.headless ? '注册流程预览' : '实时浏览器'">
          <div class="browser-screen">
            <div class="browser-bar"><span class="browser-dots"><i /><i /><i /></span><span class="browser-address">{{ config.headless ? 'accounts.openai.com / signup' : '实时浏览器' }}</span><span class="browser-lock">{{ config.headless ? '流程预览' : '待接入' }}</span></div>
            <div v-if="config.headless" class="browser-stage">
              <div class="browser-brand"><span>OpenAI</span></div>
              <div v-if="activeTask" class="browser-action">
                <a-progress type="circle" :percent="browserAction.progress" :size="58" :show-info="false" :status="runState === 'paused' ? 'normal' : activeTask.status === 'error' ? 'exception' : activeTask.status === 'success' ? 'success' : 'active'" />
                <div><strong>{{ browserAction.title }}</strong><span>{{ activeTask.email }}</span><small>{{ browserAction.detail }}</small></div>
              </div>
              <a-empty v-else :image="emptyImage" description="开始注册后显示浏览器行动" />
              <div class="browser-foot"><span>浏览器：后台运行</span><span>仅为流程预览</span></div>
            </div>
            <div v-else class="browser-live">
              <a-empty :image="emptyImage">
                <template #description><strong>等待实时浏览器画面</strong><p>浏览器服务接入后，将在这里显示真实操作。</p></template>
              </a-empty>
            </div>
          </div>
        </section>

        <a-config-provider :theme="logTheme">
        <a-card class="workspace-card log-card" :class="{ 'log-light': !logDark }" :body-style="{ padding: 0 }">
          <div class="panel-toolbar log-heading"><div class="panel-title"><span class="terminal-dots" aria-hidden="true"><i /><i /><i /></span><h2>注册日志</h2></div><a-space :size="4"><a-tag class="log-count">{{ filteredLogs.length }} 条</a-tag><a-tooltip title="导出当前筛选的演示日志"><a-button type="text" size="small" aria-label="导出日志" :disabled="!filteredLogs.length" @click="exportLogs"><template #icon><DownloadOutlined /></template></a-button></a-tooltip><a-button type="text" size="small" danger :disabled="!logs.length" @click="clearLogs">清空</a-button></a-space></div>
          <div class="log-filters"><a-radio-group v-model:value="logLevel" size="small" aria-label="日志类型"><a-radio-button value="all">全部</a-radio-button><a-radio-button value="error">仅错误</a-radio-button></a-radio-group><a-button type="text" size="small" :aria-label="logDark ? '切换为浅色日志' : '切换为深色日志'" @click="toggleLogTheme"><template #icon><BulbOutlined /></template>{{ logDark ? '浅色' : '深色' }}</a-button><a-checkbox v-model:checked="autoScroll" class="autoscroll">自动滚动</a-checkbox></div>
          <div ref="logStream" class="log-stream" tabindex="0" role="region" aria-label="注册执行日志">
            <div v-if="!filteredLogs.length" class="log-empty"><span class="terminal-prompt" aria-hidden="true">$</span><span>{{ logLevel === 'error' ? '当前没有错误日志' : '注册日志将在这里显示' }}</span><span class="terminal-cursor" aria-hidden="true" /></div>
            <div v-for="entry in filteredLogs" :key="entry.id" :data-log-id="entry.id" class="log-entry" :class="'level-' + entry.level"><div><time>{{ entry.time }}</time><strong class="log-level">[{{ logLabels[entry.level] }}]</strong><span>{{ entry.text }}</span></div><div v-if="entry.email" class="log-email">{{ entry.email }}</div></div>
          </div>
          <div class="log-footer"><span class="muted">仅显示本次演示的执行记录</span><span role="status" aria-live="polite">{{ batchLabel }} · 已完成 {{ finishedCount }}/{{ tasks.length }}</span></div>
        </a-card>
        </a-config-provider>
        </div>
      </div>
    </div>
    <registration-config-modal :open="configOpen" :config="config" :saving="tasksLoading" @save="saveConfig" @close="configOpen = false" />
    </div>
  </workspace-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Badge, Button, Card, Checkbox, ConfigProvider, Empty, Progress, Radio, Space, Table, Tag, Tooltip, message, theme } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'
import { BulbOutlined, DatabaseOutlined, DownloadOutlined, LoadingOutlined, PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons-vue'
import WorkspacePage from '@/components/WorkspacePage.vue'
import AccountManagementPanel from '@/views/account-management/AccountManagementPanel.vue'
import { mailApi } from '@/api/mail'
import type { MailRegistrationAccount } from '@/api/mail'
import { hasPermission } from '@/utils/access'
import RegistrationConfigModal from './RegistrationConfigModal.vue'
import { createTasks, REGISTRATION_STEPS, TASK_STATES } from './demo'
import type { LogLevel, RegistrationEvent, RegistrationTask } from './demo'
import { createConfig, MAIL_SOURCES } from './config'
import type { RegistrationConfig } from './config'

const LOG_THEME_KEY = 'mpro.registration.log-theme'

function stepsForConfig(config: RegistrationConfig): string[] {
  return [REGISTRATION_STEPS[0], REGISTRATION_STEPS[1], REGISTRATION_STEPS[2], REGISTRATION_STEPS[3], ...(config.checkoutEnabled ? ['检查 Checkout 类型'] : []), ...(config.paymentEnabled ? ['检测支付方式'] : []), REGISTRATION_STEPS[4]]
}

const columns: TableColumnsType = [
  { title: '注册邮箱', key: 'email', width: 200, align: 'center' }, { title: '状态', key: 'status', width: 90, align: 'center' },
  { title: '当前步骤', key: 'step', width: 120, align: 'center' }, { title: '耗时', key: 'elapsed', width: 65, align: 'center' },
  { title: '操作', key: 'actions', width: 100, align: 'center', fixed: 'right' }
]

export default defineComponent({
  name: 'AiRegisterPage',
  components: {
    WorkspacePage, RegistrationConfigModal, AccountManagementPanel, ABadge: Badge, AButton: Button, ACard: Card, ACheckbox: Checkbox,
    AConfigProvider: ConfigProvider, AEmpty: Empty,
    AProgress: Progress, ARadioGroup: Radio.Group, ARadioButton: Radio.Button,
    ASpace: Space, ATable: Table, ATag: Tag, ATooltip: Tooltip,
    BulbOutlined, DatabaseOutlined, DownloadOutlined, LoadingOutlined, PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined, SettingOutlined, StopOutlined
  },
  data() {
    const config = createConfig()
    let logDark = true
    try {
      const savedTheme = localStorage.getItem(LOG_THEME_KEY)
      if (savedTheme) logDark = savedTheme === 'dark'
    } catch { /* 无法读取偏好时使用深色。 */ }
    return {
      accounts: [] as MailRegistrationAccount[], steps: stepsForConfig(config), taskStates: TASK_STATES, columns, accountTab: 'tasks' as 'tasks' | 'accounts',
      config, configOpen: false, tasksLoading: false, accountsLoaded: false, configRequestId: 0,
      emptyImage: Empty.PRESENTED_IMAGE_SIMPLE,
      logDark,
      tasks: [] as RegistrationTask[],
      runState: 'idle' as 'idle' | 'running' | 'paused' | 'complete', timer: 0, tickCount: 0,
      logs: [] as RegistrationEvent[], nextLogId: 0, logLevel: 'all', autoScroll: true,
      logLabels: { info: '信息', success: '成功', error: '错误' }
    }
  },
  computed: {
    canConfigure(): boolean { return hasPermission('register:config') },
    logTheme(): ThemeConfig {
      return { algorithm: this.logDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: this.logDark ? '#60a5fa' : '#1677ff', colorSuccess: this.logDark ? '#34d399' : '#047857', colorWarning: this.logDark ? '#fbbf24' : '#d97706', colorError: this.logDark ? '#fb7185' : '#be123c', colorBgContainer: this.logDark ? '#161b22' : '#fff', colorBorder: this.logDark ? '#30363d' : '#e5e7eb', colorText: this.logDark ? '#cbd5e1' : '#334155', colorTextSecondary: this.logDark ? '#94a3b8' : '#64748b', fontSize: 12 } }
    },
    mailSourceLabel(): string { return MAIL_SOURCES.find(source => source.value === this.config.mailSource)?.label || '' },
    concurrency(): number { return this.config.concurrency },
    intervalSeconds(): number { return this.config.intervalSeconds },
    busy(): boolean { return this.runState === 'running' || this.runState === 'paused' },
    successCount(): number { return this.tasks.filter(task => task.status === 'success').length },
    failedCount(): number { return this.tasks.filter(task => task.status === 'error').length },
    waitingCount(): number { return this.tasks.filter(task => task.status === 'waiting').length },
    finishedCount(): number { return this.successCount + this.failedCount },
    progress(): number { return this.tasks.length ? Math.round(this.finishedCount / this.tasks.length * 100) : 0 },
    batchLabel(): string { return { idle: '待开始', running: '执行中', paused: '已暂停', complete: '执行完成' }[this.runState] },
    batchStatus(): 'default' | 'processing' | 'warning' | 'success' { return this.runState === 'running' ? 'processing' : this.runState === 'paused' || this.failedCount ? 'warning' : this.runState === 'complete' ? 'success' : 'default' },
    configSummary(): string { return [this.config.proxy ? '注册代理已配置' : '直连', this.config.checkoutEnabled ? 'Checkout 检查' : '', this.config.paymentEnabled ? '支付方式检测' : ''].filter(Boolean).join(' · ') },
    activeTask(): RegistrationTask | undefined {
      if (this.runState === 'idle') return undefined
      return this.tasks.find(task => task.status === 'running') || this.tasks.find(task => task.status === 'error') || this.tasks.find(task => task.status === 'success')
    },
    browserAction(): { progress: number; title: string; detail: string } {
      const task = this.activeTask
      if (!task) return { progress: 0, title: '等待开始', detail: '点击「开始注册」后查看实时行动' }
      if (task.status === 'error') return { progress: Math.round((task.step + 1) / this.steps.length * 100), title: '等待验证码超时', detail: '当前账号注册失败，可从任务列表重试' }
      if (task.status === 'success') return { progress: 100, title: '注册流程已完成', detail: '账号结果已保存（演示）' }
      return { progress: Math.max(8, Math.round((task.step + 1) / this.steps.length * 100)), title: this.steps[task.step], detail: '浏览器正在执行当前注册步骤（演示）' }
    },
    filteredLogs(): RegistrationEvent[] { return this.logs.filter(log => this.logLevel === 'all' || log.level === this.logLevel) },
  },
  beforeUnmount() { window.clearInterval(this.timer); this.configRequestId += 1 },
  methods: {
    switchAccountTab(tab: 'tasks' | 'accounts') { this.accountTab = tab },
    toggleLogTheme() {
      this.logDark = !this.logDark
      try { localStorage.setItem(LOG_THEME_KEY, this.logDark ? 'dark' : 'light') } catch { /* 无法保存偏好时仍可切换配色。 */ }
    },
    stageLabel(task: RegistrationTask): string { return task.status === 'waiting' ? '等待调度' : task.status === 'error' ? '验证码等待超时' : task.status === 'success' ? '已完成全部步骤' : this.steps[task.step] },
    openConfig() { this.configOpen = true },
    async saveConfig(next: RegistrationConfig) {
      if (this.tasksLoading || this.busy || !this.canConfigure) return
      const requestId = ++this.configRequestId
      this.tasksLoading = true
      try {
        const accounts = await mailApi.registrationCandidates(next.mailSource, next.quantity)
        if (requestId !== this.configRequestId) return
        this.config = { ...next }
        this.steps = stepsForConfig(next)
        this.accounts = accounts
        this.accountsLoaded = true
        this.reset()
        this.configOpen = false
        if (accounts.length < next.quantity) message.warning(`需要 ${next.quantity} 个账号，当前仅有 ${accounts.length} 个未注册邮箱，已全部载入`)
        else message.success(`已随机载入 ${accounts.length} 个未注册邮箱`)
      } catch (error) {
        if (requestId === this.configRequestId) message.error(error instanceof Error ? error.message : '获取待注册邮箱失败，请重试')
      } finally {
        if (requestId === this.configRequestId) this.tasksLoading = false
      }
    },
    reset() {
      window.clearInterval(this.timer); this.runState = 'idle'; this.tickCount = 0
      this.tasks = createTasks(this.accounts); this.logs = []; this.logLevel = 'all'
      this.addLog('info', this.tasks.length ? `已准备 ${this.tasks.length} 个未注册邮箱，等待开始。` : '当前没有可用的未注册邮箱。')
    },
    start() {
      if (!this.tasks.length || this.tasksLoading) return
      if (this.runState === 'complete') this.reset()
      this.addLog('info', this.runState === 'paused' ? '继续执行演示任务。' : `开始演示，${this.tasks.length} 个账号，${this.concurrency} 路并发。`)
      this.runState = 'running'; this.schedule()
    },
    schedule() { window.clearInterval(this.timer); this.advance(); this.timer = window.setInterval(this.advance, 1000) },
    pause() { window.clearInterval(this.timer); this.runState = 'paused'; this.addLog('info', '任务已暂停，当前进度已保留。') },
    forceStop() {
      window.clearInterval(this.timer)
      this.tasks.filter(task => task.status !== 'success').forEach(task => Object.assign(task, { status: 'waiting', step: 0, elapsed: 0, attempt: 0 }))
      this.runState = 'idle'
      this.addLog('info', `已强制停止，保留 ${this.successCount} 个已成功账号，其余账号已恢复为未注册。`)
    },
    advance() {
      this.tickCount += 1
      this.tasks.filter(task => task.status === 'running').forEach(task => {
        task.elapsed += 1
        if (task.elapsed % 3) return
        if (task.id === 3 && task.step === 2 && task.attempt === 0) { task.status = 'error'; this.addLog('error', '未在等待时间内收到验证码，可重试此账号。（模拟失败）', task.email); return }
        if (task.step === this.steps.length - 1) { task.status = 'success'; this.addLog('success', '账号注册完成，结果已保存。（演示）', task.email); return }
        task.step += 1; this.addLog('info', this.steps[task.step], task.email)
      })
      if ((this.tickCount - 1) % (this.intervalSeconds || 1) === 0) {
        const slots = this.concurrency - this.tasks.filter(task => task.status === 'running').length
        this.tasks.filter(task => task.status === 'waiting').slice(0, slots).forEach(task => { task.status = 'running'; this.addLog('info', '开始准备邮箱，检查收信状态。（演示）', task.email) })
      }
      if (this.finishedCount === this.tasks.length) { window.clearInterval(this.timer); this.runState = 'complete'; this.addLog('info', `本次演示结束：成功 ${this.successCount} 个，失败 ${this.failedCount} 个。`) }
    },
    retry(task: RegistrationTask) {
      if (task.status !== 'error') return
      Object.assign(task, { status: 'waiting', step: 0, elapsed: 0, attempt: task.attempt + 1 })
      this.addLog('info', '已重新加入任务队列。', task.email)
      if (this.runState === 'complete') { this.runState = 'running'; this.schedule() }
      message.info(this.runState === 'paused' ? '已加入队列，继续注册后执行' : '已加入重试队列')
    },
    addLog(level: LogLevel, text: string, email = '') {
      this.logs.push({ id: ++this.nextLogId, time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), level, text, email })
      if (this.autoScroll) this.$nextTick(() => { const stream = this.$refs.logStream as HTMLElement | undefined; if (stream) stream.scrollTop = stream.scrollHeight })
    },
    showLogs(task: RegistrationTask) {
      this.logLevel = 'all'
      this.$nextTick(() => {
        const stream = this.$refs.logStream as HTMLElement
        const latest = this.logs.filter(log => log.email === task.email).pop()
        const target = (latest && stream.querySelector(`[data-log-id="${latest.id}"]`)) || stream
        target.scrollIntoView({ block: 'nearest' }); stream.focus({ preventScroll: true })
      })
    },
    clearLogs() { this.logs = [] },
    exportLogs() {
      const text = this.filteredLogs.map(log => `[${log.time}] [${this.logLabels[log.level]}] ${log.email} ${log.text}`).join('\n')
      const url = URL.createObjectURL(new Blob(['OpenAI 注册演示日志\n' + text], { type: 'text/plain;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = 'openai-registration-demo.log'; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }
})
</script>

<style scoped>
.registration-page { --success: #237804; --failure: #b42318; }
:global(.workspace-page[data-theme="dark"]) .registration-page { --success: #95de64; --failure: #ff9c95; }
.registration-layout { display: block; }
.execution-area { --registration-height: max(680px, calc(100dvh - 188px)); display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); align-items: stretch; gap: 20px; min-width: 0; }
.monitor-area, .task-card { height: var(--registration-height); }
.monitor-area { display: grid; grid-template-rows: minmax(0, 1fr) minmax(0, 2fr); gap: 20px; min-width: 0; }
.task-card { min-width: 0; overflow: hidden; }
.task-card :deep(.ant-card-body) { display: flex; height: 100%; min-height: 0; flex-direction: column; }
.task-card :deep(.ant-table-wrapper) { min-height: 0; flex: 1; overflow: auto; }
.task-tabs { display: inline-flex; }
.task-tabs :deep(.ant-btn) { font-weight: 600; }
.browser-panel, .log-card { min-width: 0; min-height: 0; }
.panel-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 20px; }
.task-toolbar { border-bottom: 1px solid var(--line); }
.config-summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 11px 20px; color: var(--muted); font-size: 12px; background: var(--subtle); }
.config-summary .anticon { margin-right: 5px; }
.panel-title { display: flex; align-items: center; gap: 14px; }
.panel-title h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--ink); }
.batch-progress { padding: 0 20px 14px; }
.progress-copy { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; color: var(--muted); }
.progress-copy strong { color: var(--ink); font-variant-numeric: tabular-nums; font-size: 16px; }
.result-counts { display: flex; gap: 14px; font-variant-numeric: tabular-nums; }
.status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin: 0 5px 2px 0; }
.success-dot { background: var(--success); }.error-dot { background: var(--failure); }
.failure-text { color: var(--failure); }
.task-email { white-space: nowrap; font-size: 13px; }
.elapsed { font-variant-numeric: tabular-nums; font-size: 13px; color: var(--muted); }
.task-card :deep(.ant-table-thead > tr > th) { font-size: 12px; }
.task-card :deep(.ant-tag) { margin: 0; font-size: 12px; }
.log-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 20px; font-size: 12px; color: var(--muted); }
.browser-panel { display: flex; min-height: 0; flex-direction: column; }
.browser-screen { display: flex; min-height: 0; flex: 1; flex-direction: column; overflow: hidden; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.browser-bar { display: flex; align-items: center; flex-shrink: 0; gap: 10px; height: 30px; padding: 0 10px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 11px; }
.browser-dots { display: flex; gap: 4px; }
.browser-dots i { width: 6px; height: 6px; border-radius: 50%; background: #cbd5e1; }
.browser-dots i:first-child { background: #f59e0b; }.browser-dots i:nth-child(2) { background: #94a3b8; }.browser-dots i:last-child { background: #22c55e; }
.browser-address { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.browser-lock { font-size: 10px; opacity: .7; }
.browser-stage { display: flex; min-height: 0; flex: 1; flex-direction: column; align-items: center; justify-content: space-evenly; gap: 12px; padding: 16px; overflow: auto; }
.browser-stage > * { flex-shrink: 0; }
.browser-stage :deep(.ant-empty) { margin: 0; }
.browser-live { display: flex; flex: 1; min-height: 0; align-items: center; justify-content: center; padding: 16px; overflow: auto; }
.browser-live :deep(.ant-empty) { margin: auto; }
.browser-live strong { color: var(--ink); font-size: 13px; font-weight: 500; }
.browser-live p { margin: 6px 0 0; color: var(--muted); font-size: 12px; line-height: 1.6; }
.browser-brand { display: flex; align-items: center; gap: 8px; color: var(--ink); font-size: 14px; font-weight: 600; }
.browser-action { display: flex; align-items: center; justify-content: center; gap: 18px; width: min(100%, 360px); }
.browser-action > div:last-child { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
.browser-action strong { color: var(--ink); font-size: 15px; font-weight: 600; }
.browser-action span, .browser-action small { overflow-wrap: anywhere; color: var(--muted); font-size: 12px; line-height: 1.6; }
.browser-action small { font-size: 11px; }
.browser-foot { display: flex; justify-content: space-between; width: 100%; color: var(--muted); font-size: 11px; }
.log-heading { padding: 12px 14px; border-bottom: 1px solid var(--line); background: var(--subtle); }
.log-card .panel-title { gap: 8px; }
.log-card .panel-title h2 { font-size: 13px; }
.terminal-dots { display: flex; gap: 5px; }
.terminal-dots i { width: 7px; height: 7px; border-radius: 50%; background: #fb7185; }
.terminal-dots i:nth-child(2) { background: #fbbf24; }
.terminal-dots i:last-child { background: #34d399; }
.log-card .log-count { color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; background: var(--subtle); border-color: var(--line); }
.log-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 10px 14px; background: var(--subtle); }
.log-footer { flex-wrap: wrap; gap: 6px 12px; padding: 10px 14px; font-size: 11px; background: var(--subtle); }
.autoscroll { margin-left: auto; font-size: 12px; white-space: nowrap; color: var(--muted); }
.log-card { --surface: #0d1117; --subtle: #161b22; --line: #30363d; --muted: #94a3b8; --ink: #e2e8f0; --info: #cbd5e1; --info-bg: #ffffff06; --info-line: #ffffff0f; --success: #34d399; --failure: #fb7185; height: 100%; color: #cbd5e1; background: var(--surface); }
.log-card.log-light { --surface: #fff; --subtle: #f8fafc; --line: #e5e7eb; --muted: #64748b; --ink: #262626; --info: #2563eb; --info-bg: #eff6ff; --info-line: #bfdbfe; --success: #047857; --failure: #be123c; color: #334155; }
.log-card :deep(.ant-card-body) { display: flex; height: 100%; min-height: 0; flex-direction: column; }
.log-heading, .log-filters, .log-footer { flex-shrink: 0; }
.log-stream { height: auto; min-height: 0; flex: 1; overflow: auto; padding: 12px; border-block: 1px solid var(--line); background: var(--surface); font-family: 'Cascadia Code', Consolas, 'Liberation Mono', monospace; scrollbar-width: thin; scrollbar-color: var(--muted) var(--surface); }
.log-stream:focus-visible { outline: 2px solid #1677ff; outline-offset: -2px; }
.log-entry { margin-bottom: 6px; padding: 8px 10px; border: 1px solid var(--info-line); border-radius: 6px; background: var(--info-bg); font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; }
.log-entry:last-child { margin-bottom: 0; }
.log-entry time { margin-right: 8px; font-variant-numeric: tabular-nums; color: var(--muted); }
.log-level { margin-right: 6px; font-weight: 600; }
.log-entry.level-info { color: var(--info); }
.log-entry.level-success { color: var(--success); border-color: #10b98133; background: #10b98112; }
.log-entry.level-error { color: var(--failure); border-color: #f43f5e33; background: #f43f5e14; }
.log-email { margin-top: 4px; color: var(--muted); font-size: 11px; }
.log-empty { display: flex; align-items: center; justify-content: center; gap: 8px; height: 100%; color: var(--muted); font-size: 12px; }
.terminal-prompt { color: var(--success); }
.terminal-cursor { flex-shrink: 0; width: 6px; height: 13px; background: #64748b; }
@media (max-width: 1150px) { .execution-area { --registration-height: 680px; grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 600px) { .panel-toolbar, .batch-progress { padding-inline: 14px; } .config-summary { align-items: flex-start; flex-direction: column; gap: 4px; padding-inline: 14px; } .task-toolbar :deep(.ant-space) { flex-wrap: wrap; justify-content: flex-end; } .task-tabs :deep(.ant-btn) { padding-inline: 8px; } .panel-title { gap: 8px; } .progress-copy { align-items: flex-start; flex-direction: column; } .browser-stage { padding-inline: 14px; } .browser-action { align-items: flex-start; } }
</style>
