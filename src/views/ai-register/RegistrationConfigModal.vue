<template>
  <a-modal :open="open" title="注册配置" :width="760" :mask-closable="false" :confirm-loading="saving" :closable="!saving" :keyboard="!saving" :cancel-button-props="{ disabled: saving }" ok-text="保存配置" @ok="save" @cancel="!saving && $emit('close')">
    <div class="config-dialog">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="basic" tab="基础配置">
          <a-form layout="vertical">
            <div class="source-note"><MailOutlined /><div><strong>注册账号</strong><p>按注册数量从所选来源自动获取邮箱</p></div><a-tag>OpenAI</a-tag></div>
            <a-form-item label="邮箱来源" :validate-status="errors.source ? 'error' : undefined" :help="errors.source">
              <a-select v-model:value="draft.mailSource" :options="sources" placeholder="选择邮箱来源" aria-label="邮箱来源" />
            </a-form-item>
            <div class="form-grid">
              <a-form-item label="注册数量" :validate-status="errors.quantity ? 'error' : undefined" :help="errors.quantity"><a-input-number v-model:value="draft.quantity" :min="1" :max="maxCount" :precision="0" addon-after="个" aria-label="注册数量" @change="syncConcurrency" /></a-form-item>
              <a-form-item label="并发任务数"><a-input-number v-model:value="draft.concurrency" :min="1" :max="Math.max(1, draft.quantity)" :precision="0" addon-after="个" aria-label="并发任务数" /></a-form-item>
            </div>
            <div class="switch-row"><div><label for="registration-headless">后台运行浏览器</label><p>开启显示流程预览，关闭显示实时浏览器画面</p></div><a-switch id="registration-headless" v-model:checked="draft.headless" /></div>
          </a-form>
        </a-tab-pane>
        <a-tab-pane key="proxy" tab="注册代理">
          <a-form layout="vertical">
            <p class="section-description">注册过程使用的网络代理。留空时使用直连，填写多条可按策略分配给账号。</p>
            <a-form-item label="代理地址" :validate-status="errors.proxy ? 'error' : undefined" :help="errors.proxy || proxyHelp">
              <a-textarea v-model:value="draft.proxy" :rows="6" :placeholder="proxyPlaceholder" aria-label="注册代理地址" spellcheck="false" />
            </a-form-item>
            <a-form-item label="分配策略"><a-select v-model:value="draft.proxyStrategy" :options="strategies" aria-label="注册代理分配策略" /></a-form-item>
          </a-form>
        </a-tab-pane>
        <a-tab-pane key="checks" tab="注册后检测">
          <div class="switch-row"><div><label for="checkout-check">Checkout 类型检查</label><p>识别 oaics / cs_live 类型</p></div><a-switch id="checkout-check" v-model:checked="draft.checkoutEnabled" /></div>
          <a-form v-if="draft.checkoutEnabled" layout="vertical" class="checkout-fields">
            <a-form-item label="检查代理" required :validate-status="errors.checkoutProxy ? 'error' : undefined" :help="errors.checkoutProxy || proxyHelp">
              <a-textarea v-model:value="draft.checkoutProxy" :rows="3" :placeholder="proxyPlaceholder" aria-label="检查代理地址" spellcheck="false" />
            </a-form-item>
            <a-form-item label="分配策略"><a-select v-model:value="draft.checkoutProxyStrategy" :options="strategies" aria-label="检查代理分配策略" /></a-form-item>
            <p class="field-note">检查代理独立配置，仅用于 Checkout 类型检查。</p>
          </a-form>
          <div class="switch-row payment-row"><div><label for="payment-check">支付方式检测</label><p>获取账号可用的支付方式，可独立开启</p></div><a-switch id="payment-check" v-model:checked="draft.paymentEnabled" /></div>
        </a-tab-pane>
      </a-tabs>
    </div>
  </a-modal>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Form, Input, InputNumber, Modal, Select, Switch, Tabs, Tag } from 'ant-design-vue'
import { MailOutlined } from '@ant-design/icons-vue'
import { createConfig, MAIL_SOURCES, MAX_REGISTRATION_ACCOUNTS, PROXY_STRATEGIES, proxyError } from './config'
import type { RegistrationConfig } from './config'

export default defineComponent({
  name: 'RegistrationConfigModal',
  components: {
    AForm: Form, AFormItem: Form.Item, ATextarea: Input.TextArea, AInputNumber: InputNumber,
    AModal: Modal, ASelect: Select, ASwitch: Switch, ATabs: Tabs, ATabPane: Tabs.TabPane, ATag: Tag, MailOutlined
  },
  props: {
    open: Boolean,
    saving: Boolean,
    config: { type: Object as PropType<RegistrationConfig>, required: true },
  },
  emits: ['save', 'close'],
  data() {
    return {
      draft: createConfig(), activeTab: 'basic', sources: MAIL_SOURCES, strategies: PROXY_STRATEGIES, maxCount: MAX_REGISTRATION_ACCOUNTS,
      errors: { source: '', quantity: '', proxy: '', checkoutProxy: '' },
      proxyHelp: '每行一条，支持 HTTP、HTTPS、SOCKS5 及 host:port:user:pass。',
      proxyPlaceholder: 'http://127.0.0.1:7890\nsocks5://user:password@host:1080'
    }
  },
  watch: {
    open(value: boolean) {
      if (!value) return
      this.draft = { ...this.config }
      this.activeTab = 'basic'; this.errors = { source: '', quantity: '', proxy: '', checkoutProxy: '' }
    }
  },
  methods: {
    syncConcurrency() { this.draft.concurrency = Math.max(1, Math.min(this.draft.concurrency || 1, this.draft.quantity || 1)) },
    save() {
      if (this.saving) return
      this.errors = {
        source: this.sources.some(source => source.value === this.draft.mailSource) ? '' : '请选择邮箱来源',
        quantity: Number.isInteger(this.draft.quantity) && this.draft.quantity >= 1 && this.draft.quantity <= this.maxCount ? '' : `注册数量应为 1 至 ${this.maxCount} 个`,
        proxy: proxyError(this.draft.proxy),
        checkoutProxy: this.draft.checkoutEnabled ? (this.draft.checkoutProxy.trim() ? proxyError(this.draft.checkoutProxy) : '开启类型检查后，请至少填写一条检查代理') : ''
      }
      if (this.errors.source || this.errors.quantity) { this.activeTab = 'basic'; return }
      if (this.errors.proxy) { this.activeTab = 'proxy'; return }
      if (this.errors.checkoutProxy) { this.activeTab = 'checks'; return }
      this.syncConcurrency()
      this.$emit('save', {
        ...this.draft,
        intervalSeconds: Math.max(0, Math.min(60, this.draft.intervalSeconds || 0)),
        stepDelaySeconds: Math.max(0, Math.min(30, this.draft.stepDelaySeconds || 0)),
        proxy: this.draft.proxy.trim(), checkoutProxy: this.draft.checkoutProxy.trim()
      })
    }
  }
})
</script>

<style scoped>
.config-dialog { padding-top: 4px; }
.config-dialog :deep(.ant-tabs-content-holder) { min-height: 390px; max-height: 60vh; overflow-y: auto; scrollbar-width: thin; }
.config-dialog :deep(.ant-tabs-tabpane) { padding: 6px 4px 6px 0; }
.config-dialog :deep(.ant-form-item) { margin-bottom: 22px; }
.config-dialog :deep(.ant-input-number-group-wrapper) { width: 100%; }
.source-note { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
.source-note > .anticon { font-size: 24px; opacity: .6; }
.source-note strong { font-weight: 600; }
.source-note .ant-tag { margin-left: auto; margin-right: 0; }
.source-note p, .switch-row p, .field-note { margin: 4px 0 0; font-size: 12px; line-height: 1.8; opacity: .7; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 6px 0 18px; }
.switch-row label { font-weight: 500; cursor: pointer; }
.section-description { margin: 0 0 22px; line-height: 1.8; opacity: .7; }
.checkout-fields { padding: 4px 0 20px; }
.checkout-fields :deep(.ant-form-item:last-of-type) { margin-bottom: 10px; }
.payment-row { padding-top: 20px; border-top: 1px solid rgba(128, 128, 128, .18); }
@media (max-width: 600px) {
  .config-dialog :deep(.ant-tabs-content-holder) { min-height: 360px; max-height: 58vh; }
  .form-grid { gap: 0 12px; }
  .source-note p { max-width: 180px; }
}
</style>
