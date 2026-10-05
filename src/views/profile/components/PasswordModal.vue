<template>
  <a-modal :open="open" title="修改登录密码" :width="480" ok-text="确认修改" cancel-text="取消"
    :confirm-loading="saving" :ok-button-props="{ htmlType: 'submit', form: 'profile-password-form' }"
    :cancel-button-props="{ disabled: saving }" :mask-closable="false" :closable="!saving" :keyboard="!saving"
    destroy-on-close :after-close="resetForm" @cancel="$emit('close')">
    <a-alert class="password-notice" type="info" show-icon message="修改成功后，此账号的所有登录会话将退出，请使用新密码重新登录。" />
    <a-form id="profile-password-form" :model="passwords" layout="vertical" :required-mark="false" @finish="savePassword">
      <a-form-item label="当前密码" name="current" :rules="[{ required: true, message: '请填写当前密码' }]">
        <a-input-password v-model:value="passwords.current" autocomplete="current-password" :maxlength="64" :disabled="saving" placeholder="输入当前密码" />
      </a-form-item>
      <a-form-item label="新密码" name="next" :dependencies="['current']" :rules="[{ required: true, message: '请填写新密码' }, { min: 8, max: 64, message: '新密码为 8–64 个字符' }, { validator: validateNewPassword }]">
        <a-input-password v-model:value="passwords.next" autocomplete="new-password" :maxlength="64" :disabled="saving" placeholder="8–64 位，建议组合字母、数字和符号" />
      </a-form-item>
      <a-form-item label="确认新密码" name="confirm" :dependencies="['next']" :rules="[{ required: true, message: '请再次填写新密码' }, { validator: validateConfirmation }]">
        <a-input-password v-model:value="passwords.confirm" autocomplete="new-password" :maxlength="64" :disabled="saving" placeholder="再次输入新密码" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Alert, Form, Input, Modal, message } from 'ant-design-vue'
import { profileApi } from '@/api/profile'
import { clearAuthToken } from '@/utils/auth-token'

export default defineComponent({
  name: 'PasswordModal',
  components: { AAlert: Alert, AForm: Form, AFormItem: Form.Item, AInputPassword: Input.Password, AModal: Modal },
  props: { open: Boolean },
  emits: ['close', 'saving'],
  data() {
    return { saving: false, passwords: { current: '', next: '', confirm: '' } }
  },
  methods: {
    resetForm() {
      this.passwords = { current: '', next: '', confirm: '' }
    },
    validateNewPassword(_rule: unknown, value: string) {
      if (value && value === this.passwords.current) return Promise.reject(new Error('新密码不能与当前密码相同'))
      return value && new TextEncoder().encode(value).length > 72
        ? Promise.reject(new Error('新密码的 UTF-8 长度不能超过 72 字节')) : Promise.resolve()
    },
    validateConfirmation(_rule: unknown, value: string) {
      return value && value !== this.passwords.next ? Promise.reject(new Error('两次输入的新密码不一致')) : Promise.resolve()
    },
    async savePassword() {
      if (this.saving) return
      this.saving = true
      this.$emit('saving', true)
      try {
        await profileApi.changePassword(this.passwords.current, this.passwords.next)
        this.resetForm()
        this.$emit('close')
        message.success('密码已修改，请使用新密码重新登录')
        clearAuthToken()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '修改失败，请稍后重试')
      } finally {
        this.saving = false
        this.$emit('saving', false)
      }
    }
  }
})
</script>

<style scoped>
.password-notice { margin: 20px 0 24px; }
</style>
