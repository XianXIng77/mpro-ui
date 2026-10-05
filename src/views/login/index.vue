<template>
  <a-config-provider :theme="themeConfig">
    <div class="login-page" :class="{ 'is-dark': isDark }">
      <div class="ambient-grid" aria-hidden="true" />
      <div class="ambient-orbit" aria-hidden="true" />

      <header class="page-header">
        <a-button type="text" class="theme-button" :aria-label="isDark ? '切换浅色外观' : '切换深色外观'" @click="toggleTheme">
          <template #icon><BulbOutlined /></template>{{ isDark ? '浅色外观' : '深色外观' }}
        </a-button>
      </header>

      <main class="login-main">
        <div class="login-content">
          <div class="brand">
            <div class="brand-symbol"><SystemLogo compact /><span aria-hidden="true" /></div>
            <h1>MERCURY <span class="pro-label">PRO</span></h1>
            <p>邮箱管理 · 自动化任务 · 团队协作</p>
          </div>

          <section class="auth-card" aria-label="账号访问">
            <div class="mode-tabs" :class="{ 'is-register': isRegister }" role="tablist" aria-label="账号操作" @keydown.left.prevent="setMode('login')" @keydown.right.prevent="setMode('register')">
              <a-button v-for="item in modes" :id="'tab-' + item.value" :key="item.value" type="text" role="tab"
                :aria-selected="mode === item.value" aria-controls="auth-panel" :tabindex="mode === item.value ? 0 : -1"
                :class="{ active: mode === item.value }" :disabled="submitting" @click="setMode(item.value)">
                {{ item.label }}
              </a-button>
            </div>

            <div id="auth-panel" role="tabpanel" :aria-labelledby="'tab-' + mode">
              <div class="form-heading">
                <h2>{{ isRegister ? '开启新的工作旅程' : '欢迎回来' }}<span class="heading-dot">.</span></h2>
                <p>{{ isRegister ? '使用邀请码，加入你的团队工作台。' : '登录你的账号，让工作有序继续。' }}</p>
              </div>

              <a-form name="auth" class="auth-form" layout="vertical" novalidate :model="form" :disabled="submitting" :required-mark="false" @finish="submit">
                <div class="register-reveal" :class="{ 'is-open': isRegister }" :aria-hidden="!isRegister">
                  <div class="register-fields">
                    <a-form-item label="用户名" name="username" html-for="auth-name" :validate-status="errors.username ? 'error' : ''">
                      <template v-if="errors.username" #help><span id="auth_username_help">{{ errors.username }}</span></template>
                      <a-input id="auth-name" v-model:value="form.username" class="auth-input" :disabled="!isRegister || submitting"
                        autocomplete="nickname" placeholder="如何称呼你" :maxlength="40" :aria-invalid="!!errors.username"
                        :aria-describedby="errors.username ? 'auth_username_help' : undefined" @input="errors.username = ''">
                        <template #prefix><UserOutlined /></template>
                      </a-input>
                    </a-form-item>
                    <a-form-item label="邀请码" name="inviteCode" html-for="auth-invite" :validate-status="errors.inviteCode ? 'error' : ''">
                      <template v-if="errors.inviteCode" #help><span id="auth_inviteCode_help">{{ errors.inviteCode }}</span></template>
                      <a-input id="auth-invite" v-model:value="form.inviteCode" class="auth-input" :disabled="!isRegister || submitting"
                        autocomplete="off" placeholder="输入邀请码" :maxlength="64" spellcheck="false" :aria-invalid="!!errors.inviteCode"
                        :aria-describedby="errors.inviteCode ? 'auth_inviteCode_help' : undefined" @input="errors.inviteCode = ''">
                        <template #prefix><KeyOutlined /></template>
                      </a-input>
                    </a-form-item>
                  </div>
                </div>

                <a-form-item label="邮箱地址" name="email" html-for="auth-email" :validate-status="errors.email ? 'error' : ''">
                  <template v-if="errors.email" #help><span id="auth_email_help">{{ errors.email }}</span></template>
                  <a-input id="auth-email" v-model:value="form.email" class="auth-input" type="email" autocomplete="username" inputmode="email"
                    placeholder="name@example.com" :maxlength="320" :aria-invalid="!!errors.email"
                    :aria-describedby="errors.email ? 'auth_email_help' : undefined" @input="errors.email = ''">
                    <template #prefix><MailOutlined /></template>
                  </a-input>
                </a-form-item>

                <a-form-item :label="isRegister ? '设置密码' : '密码'" name="password" html-for="auth-password"
                  :validate-status="errors.password ? 'error' : ''">
                  <template v-if="errors.password" #help><span id="auth_password_help">{{ errors.password }}</span></template>
                  <a-input-password id="auth-password" v-model:value="form.password" v-model:visible="showPassword" class="auth-input"
                    :autocomplete="isRegister ? 'new-password' : 'current-password'" :placeholder="isRegister ? '至少 8 位字符' : '输入你的密码'"
                    :maxlength="72" :aria-invalid="!!errors.password" :aria-describedby="errors.password ? 'auth_password_help' : undefined"
                    @input="errors.password = ''">
                    <template #prefix><LockOutlined /></template>
                    <template #iconRender="visible">
                      <a-button type="text" class="password-toggle" :disabled="submitting" :aria-label="visible ? '隐藏密码' : '显示密码'" :aria-pressed="visible">
                        <EyeInvisibleOutlined v-if="visible" /><EyeOutlined v-else />
                      </a-button>
                    </template>
                  </a-input-password>
                </a-form-item>

                <div class="form-options">
                  <a-checkbox v-model:checked="remember" class="remember-me">记住我</a-checkbox>
                  <a-button v-if="!isRegister" type="link" size="small" class="text-button" @click="dialog = 'password'">忘记密码？</a-button>
                  <span v-else class="invite-note">仅限受邀用户注册</span>
                </div>

                <a-button type="primary" html-type="submit" block class="submit-button" :class="{ 'is-success': submitStatus === 'success' }"
                  :disabled="submitting" :aria-busy="submitStatus === 'loading'" :aria-label="submitLabel" aria-live="polite">
                  <svg v-if="submitting" class="submit-status" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <g class="status-spinner"><circle class="status-ring" cx="12" cy="12" r="9" pathLength="1" /></g>
                    <path class="status-check" d="m7.5 12 3 3 6-6" pathLength="1" />
                  </svg>
                  <span :class="{ 'status-label': submitting }">{{ submitLabel }}</span>
                </a-button>
              </a-form>

              <div class="social-divider"><span>或使用其他方式登录</span></div>
              <div class="social-buttons" aria-label="其他登录方式">
                <a-button v-for="provider in providers" :key="provider.name" shape="circle" :aria-label="provider.name + ' 登录'" :title="provider.name + ' 登录'" @click="dialog = 'social'">
                  <template #icon><component :is="provider.icon" /></template>
                </a-button>
              </div>
            </div>
          </section>

          <p class="under-card"><SafetyCertificateOutlined />专注于工作，让繁琐留在身后。</p>
        </div>
      </main>

      <footer class="page-footer"><span>© {{ year }} Mercury Pro</span><span>有序，方能从容。</span></footer>

      <a-modal :open="!!dialog" :title="dialogTitle" :footer="null" centered :width="380" @cancel="dialog = ''">
        <p class="dialog-description">{{ dialogDescription }}</p>
        <a-button block @click="dialog = ''">知道了</a-button>
      </a-modal>
    </div>
  </a-config-provider>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Button, Checkbox, ConfigProvider, Form, Input, Modal, message, theme } from 'ant-design-vue'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'
import {
  BulbOutlined, EyeInvisibleOutlined, EyeOutlined,
  GithubOutlined, GoogleOutlined, KeyOutlined, LockOutlined, MailOutlined, QqOutlined,
  SafetyCertificateOutlined, UserOutlined, WechatOutlined
} from '@ant-design/icons-vue'
import SystemLogo from '@/components/SystemLogo.vue'
import { login, register } from '@/api/auth'
import { loginDestination } from '@/router'

type Mode = 'login' | 'register'
type Field = 'username' | 'inviteCode' | 'email' | 'password'
type Dialog = '' | 'password' | 'social'
const APPEARANCE_KEY = 'mpro.login.appearance'

export default defineComponent({
  name: 'LoginPage',
  components: {
    SystemLogo, AButton: Button, ACheckbox: Checkbox, AConfigProvider: ConfigProvider,
    AForm: Form, AFormItem: Form.Item, AInput: Input, AInputPassword: Input.Password, AModal: Modal,
    BulbOutlined, EyeInvisibleOutlined, EyeOutlined, KeyOutlined, LockOutlined,
    MailOutlined, SafetyCertificateOutlined, UserOutlined, GoogleOutlined, GithubOutlined, WechatOutlined, QqOutlined
  },
  data() {
    return {
      mode: 'login' as Mode,
      modes: [{ value: 'login' as Mode, label: '登录' }, { value: 'register' as Mode, label: '注册' }],
      providers: [
        { name: 'Google', icon: 'GoogleOutlined' }, { name: 'GitHub', icon: 'GithubOutlined' },
        { name: '微信', icon: 'WechatOutlined' }, { name: 'QQ', icon: 'QqOutlined' }
      ],
      form: { username: '', inviteCode: '', email: 'm@xianxing.art', password: '12345678' },
      errors: {} as Partial<Record<Field, string>>,
      submitStatus: 'idle' as 'idle' | 'loading' | 'success',
      redirectTimer: 0,
      remember: false,
      showPassword: false,
      isDark: false,
      dialog: '' as Dialog,
      year: new Date().getFullYear()
    }
  },
  computed: {
    themeConfig(): ThemeConfig {
      return {
        algorithm: this.isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: this.isDark ? '#ed9c51' : '#ad541b', borderRadius: 9, fontSize: 13,
          colorText: this.isDark ? '#f1f1ed' : '#262725',
          colorTextSecondary: this.isDark ? '#a4a5a0' : '#74756f',
          colorTextPlaceholder: this.isDark ? '#a4a5a0' : '#74756f'
        }
      }
    },
    isRegister(): boolean { return this.mode === 'register' },
    submitting(): boolean { return this.submitStatus !== 'idle' },
    submitLabel(): string {
      if (this.submitStatus === 'success') return this.isRegister ? '注册成功' : '登录成功'
      if (this.submitStatus === 'loading') return this.isRegister ? '正在创建账号' : '正在登录'
      return this.isRegister ? '创建账号' : '登录'
    },
    dialogTitle(): string {
      return this.dialog === 'password' ? '找回密码' : '其他登录方式'
    },
    dialogDescription(): string {
      if (this.dialog === 'password') return '如需找回账号，请联系工作台管理员。'
      return '该登录方式暂未开放，敬请期待。'
    }
  },
  mounted() {
    try {
      this.isDark = localStorage.getItem(APPEARANCE_KEY) === 'classic-dark'
    } catch { /* 存储不可用时仍可正常切换外观。 */ }
  },
  beforeUnmount() {
    window.clearTimeout(this.redirectTimer)
  },
  methods: {
    toggleTheme() {
      this.isDark = !this.isDark
      try { localStorage.setItem(APPEARANCE_KEY, this.isDark ? 'classic-dark' : 'classic-light') } catch { /* 外观选择不影响登录。 */ }
    },
    setMode(mode: Mode) {
      if (mode === this.mode || this.submitting) return
      this.mode = mode
      this.errors = {}
      this.form.password = ''
      this.showPassword = false
      this.$nextTick(() => document.getElementById('tab-' + mode)?.focus())
    },
    async submit() {
      if (this.submitting) return
      const errors: Partial<Record<Field, string>> = {}
      if (this.isRegister && this.form.username.trim().length < 2) errors.username = '请输入至少 2 个字符'
      if (this.isRegister && !this.form.inviteCode.trim()) errors.inviteCode = '请输入邀请码'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) errors.email = '请输入有效的邮箱地址'
      if (!this.form.password) errors.password = '请输入密码'
      else if (this.isRegister && this.form.password.length < 8) errors.password = '密码至少需要 8 位字符'
      else if (new TextEncoder().encode(this.form.password).length > 72) errors.password = '密码不能超过 72 个 UTF-8 字节'
      this.errors = errors
      if (Object.keys(errors).length) {
        this.$nextTick(() => document.querySelector<HTMLInputElement>('.auth-card input[aria-invalid="true"]')?.focus())
        return
      }
      this.submitStatus = 'loading'
      try {
        if (this.isRegister) {
          await register({ ...this.form, email: this.form.email.trim(), username: this.form.username.trim(), inviteCode: this.form.inviteCode.trim() }, this.remember)
        } else {
          await login(this.form.email.trim(), this.form.password, this.remember)
        }
        this.form.password = ''
        this.submitStatus = 'success'
        message.success({ key: 'auth-submit', content: this.submitLabel })
        this.redirectTimer = window.setTimeout(() => {
          this.$router.replace(loginDestination(this.$route.query.redirect))
        }, 600)
      } catch (error) {
        message.error({ key: 'auth-submit', content: error instanceof Error ? error.message : '请求失败，请稍后重试' })
        this.submitStatus = 'idle'
      }
    }
  }
})
</script>

<style scoped>
.login-page {
  --page-bg: #f4f3ef;
  --card-bg: rgba(255, 255, 255, .93);
  --ink: #262725;
  --muted: #74756f;
  --line: #e7e7e1;
  --field-bg: #fafaf8;
  --accent: #ad541b;
  --focus: #c77c37;
  --focus-ring: #e5a55f20;
  --tab-bg: #2c2d2a;
  --tab-dot: #ffab56;
  --button-from: #ffb563;
  --button-to: #f39a45;
  --button-border: #e9943e;
  --button-ink: #352416;
  --button-shadow: #ca7d2422;
  --button-hover-shadow: #ca7d2438;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100svh;
  color: var(--ink);
  background: radial-gradient(ellipse at 50% 12%, #f7e5cf 0, transparent 54%), var(--page-bg);
}
.login-page.is-dark {
  --page-bg: #17181b;
  --card-bg: rgba(34, 35, 38, .96);
  --ink: #f1f1ed;
  --muted: #a4a5a0;
  --line: #3c3d40;
  --field-bg: #292a2d;
  --accent: #ffb36a;
  --tab-bg: #484945;
  background: radial-gradient(ellipse at 50% 12%, #3b2c23 0, transparent 54%), var(--page-bg);
  color-scheme: dark;
}
button, input { font: inherit; }
button { cursor: pointer; }
button, a, input { -webkit-tap-highlight-color: transparent; }
button:focus-visible, a:focus-visible, input[type="checkbox"]:focus-visible { outline: 3px solid var(--focus); outline-offset: 4px; }
.login-page ::selection { color: var(--card-bg); background: var(--accent); }
.login-page input { caret-color: var(--accent); }
.ambient-grid, .ambient-orbit { position: absolute; pointer-events: none; z-index: -1; }
.ambient-grid {
  inset: 0;
  background-image: linear-gradient(#7b695912 1px, transparent 1px), linear-gradient(90deg, #7b695912 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at 50% 35%, #000 5%, transparent 72%);
}
.ambient-orbit {
  top: 120px;
  left: 50%;
  width: min(760px, 94%);
  aspect-ratio: 1;
  border: 1px solid #b58b5620;
  border-radius: 50%;
  transform: translateX(-50%);
  box-shadow: 0 0 0 75px #b58b5606, 0 0 0 150px #b58b5604;
}
.page-header, .page-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 26px 40px; }
.page-header { position: relative; z-index: 1; justify-content: flex-end; }
.theme-button { color: var(--muted); font-size: 12px; }
.theme-button:hover { color: var(--accent); }
.login-main { display: flex; flex: 1; justify-content: center; align-items: center; padding: 8px 20px 24px; }
.login-content { width: 100%; max-width: 420px; animation: page-enter .65s ease both; }
.brand { margin-bottom: 28px; text-align: center; }
.brand-symbol { position: relative; display: grid; place-items: center; width: 52px; height: 52px; margin: 0 auto 17px; border: 1px solid #454643; border-radius: 15px; color: #faf8f3; background: #252623; box-shadow: 0 8px 20px #29221b16; }
.brand-symbol svg { width: 32px; height: 29px; }
.brand-symbol > span { position: absolute; right: -3px; top: -3px; width: 11px; height: 11px; border: 3px solid #f4e6d6; border-radius: 50%; background: #ee963a; }
.brand h1 { display: flex; align-items: center; justify-content: center; gap: 9px; margin: 0; font-size: 24px; font-weight: 750; letter-spacing: 3px; }
.pro-label { padding: 3px 5px; border: 1px solid #b58b5650; border-radius: 4px; color: var(--accent); font-size: 9px; font-weight: 700; letter-spacing: 1px; }
.brand p { margin: 9px 0 0; color: var(--muted); font-size: 12px; letter-spacing: 1px; }
.auth-card { padding: 27px 31px 25px; border: 1px solid var(--line); border-radius: 20px; background: var(--card-bg); box-shadow: 0 20px 60px -25px #382c2525, 0 2px 8px #382c2504; }
.mode-tabs { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border: 1px solid var(--line); border-radius: 10px; background: var(--field-bg); }
.mode-tabs::before { content: ''; position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 12px) / 2); border-radius: 7px; background: var(--tab-bg); box-shadow: 0 2px 5px #20202015; transition: transform .32s cubic-bezier(.22, 1, .36, 1); pointer-events: none; }
.mode-tabs.is-register::before { transform: translateX(calc(100% + 4px)); }
.mode-tabs button { position: relative; height: 35px; border: 0; border-radius: 7px; background: transparent; color: var(--muted); font-size: 13px; font-weight: 600; transition: color .2s; }
.mode-tabs button.active, .mode-tabs button.active:hover { color: #f8f7f3; background: transparent; }
.mode-tabs button.active::before { content: ''; display: inline-block; width: 5px; height: 5px; margin: 0 7px 2px 0; border-radius: 50%; background: var(--tab-dot); }
.form-heading { margin: 25px 0 23px; }
.form-heading h2 { margin: 0 0 8px; font-size: 23px; font-weight: 650; letter-spacing: -.7px; line-height: 1.35; color: var(--ink); }
.heading-dot { margin-left: 3px; color: #e88c35; }
.form-heading p { margin: 0; color: var(--muted); font-size: 12px; }
.auth-form :deep(.ant-form-item) { margin-bottom: 18px; }
.auth-form :deep(.ant-form-item-label) { padding-bottom: 8px; }
.auth-form :deep(.ant-form-item-label > label) { height: auto; color: var(--ink); font-size: 12px; font-weight: 600; }
.auth-form :deep(.ant-form-item-explain-error) { padding-top: 6px; font-size: 12px; }
.submit-button:disabled { cursor: wait; opacity: 1; transform: none; }
.submit-button:disabled::after { animation: none; display: none; }
.auth-form .auth-input { height: 46px; padding: 0 13px; border-color: var(--line); background: var(--field-bg); }
.auth-form .auth-input:focus-within { border-color: var(--focus); box-shadow: 0 0 0 3px var(--focus-ring); }
.auth-form .auth-input.ant-input-affix-wrapper-status-error { border-color: #d05649; }
.auth-input :deep(.ant-input) { color: var(--ink); background: transparent; caret-color: var(--accent); }
.auth-input :deep(.ant-input-prefix) { margin-right: 11px; color: var(--muted); font-size: 15px; }
.auth-input :deep(input:-webkit-autofill) { -webkit-text-fill-color: var(--ink); box-shadow: 0 0 0 50px var(--field-bg) inset; }
.password-toggle { width: 28px; height: 30px; padding: 0; margin-right: -5px; color: var(--muted); }
.password-toggle:hover { color: var(--accent); }
.register-reveal { display: grid; grid-template-rows: 0fr; opacity: 0; transform: translateY(-6px); visibility: hidden; transition: grid-template-rows .28s ease-out, opacity .2s ease-out, transform .28s ease-out, visibility 0s .28s; }
.register-reveal.is-open { grid-template-rows: 1fr; opacity: 1; transform: translateY(0); visibility: visible; transition-delay: 0s; }
.register-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; min-height: 0; overflow: hidden; }
.form-options { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 1px 0 23px; font-size: 12px; }
.remember-me { color: var(--muted); font-size: 12px; }
.text-button { height: auto; padding: 0; color: var(--accent); font-size: 12px; }
.text-button:hover { text-decoration: underline; text-underline-offset: 3px; }
.invite-note { color: var(--muted); font-size: 11px; }
.submit-button, .submit-button:disabled { position: relative; isolation: isolate; display: flex; align-items: center; justify-content: center; gap: 12px; height: 47px; overflow: hidden; font-size: 14px; font-weight: 650; border: 1px solid var(--button-border); border-radius: 9px; color: var(--button-ink); background: linear-gradient(105deg, var(--button-from), var(--button-to)); box-shadow: 0 5px 13px var(--button-shadow); transition: transform .2s, box-shadow .2s; }
.submit-button > span { position: relative; z-index: 1; }
.submit-button .status-label { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.submit-status { width: 24px; height: 24px; }
.status-spinner { transform-origin: center; animation: status-spin .8s linear infinite; }
.status-ring { stroke-dasharray: .75 1; transition: stroke-dasharray .18s ease-out; }
.status-check { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset .28s ease-out .16s; }
.is-success .status-spinner { animation-play-state: paused; }
.is-success .status-ring { stroke-dasharray: 1 1; }
.is-success .status-check { stroke-dashoffset: 0; }
.submit-button.is-success { cursor: default; }
.submit-button:not(:disabled):hover { color: var(--button-ink); border-color: var(--button-border); background: linear-gradient(105deg, var(--button-from), var(--button-to)); transform: translateY(-1px); box-shadow: 0 7px 20px var(--button-hover-shadow); }
.submit-button:active { transform: translateY(1px); }
.submit-button::after { content: ''; position: absolute; top: -50%; left: 0; width: 32%; height: 200%; background: linear-gradient(90deg, transparent, #fff8, transparent); animation: button-shine 4.2s ease-in-out infinite; pointer-events: none; }
.social-divider { display: flex; align-items: center; gap: 13px; margin: 25px 0 17px; color: var(--muted); font-size: 10px; }
.social-divider::before, .social-divider::after { content: ''; flex: 1; height: 1px; background: var(--line); }
.social-buttons { display: flex; justify-content: center; gap: 16px; }
.social-buttons button { display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid var(--line); border-radius: 50%; color: var(--muted); background: transparent; font-size: 17px; transition: color .2s, border-color .2s, transform .2s; }
.social-buttons button:hover { color: var(--accent); border-color: var(--focus); transform: translateY(-2px); }
.under-card { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 22px 0 0; color: var(--muted); font-size: 11px; }
.page-footer { position: relative; color: var(--muted); font-size: 10px; letter-spacing: .5px; padding-block: 21px; }
.dialog-description { opacity: .75; line-height: 1.8; margin: 16px 0 24px; }

@keyframes button-shine {
  0%, 8% { transform: translateX(-180%) skewX(-20deg); opacity: 0; }
  14% { opacity: 1; }
  62% { transform: translateX(450%) skewX(-20deg); opacity: 1; }
  72%, 100% { transform: translateX(450%) skewX(-20deg); opacity: 0; }
}
@keyframes page-enter { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes status-spin { to { transform: rotate(360deg); } }
@media (max-width: 600px) {
  .page-header, .page-footer { padding: 20px 22px; }
  .login-main { padding: 8px 20px 20px; }
  .brand { margin-bottom: 24px; }
  .auth-card { padding: 23px; }
  .ambient-orbit { top: 190px; }
}
@media (max-width: 360px) {
  .register-fields { grid-template-columns: 1fr; gap: 0; }
  .auth-card { padding: 20px; }
  .brand p { letter-spacing: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .login-content, .submit-button::after, .status-spinner { animation: none; }
  .submit-button::after { display: none; }
  *, *::before, *::after { transition: none !important; }
}
</style>
