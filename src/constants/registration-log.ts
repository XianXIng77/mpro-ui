import type { RegistrationStage } from '@/types/registration-log'

export const REGISTRATION_TARGETS = [
  { value: 'openai', label: 'OpenAI（ChatGPT）' },
  { value: 'grok', label: 'Grok（xAI）' }
]

export const REGISTRATION_STAGES = [
  { value: 'plus-trial', label: 'Plus 试用检查' },
  { value: 'checkout-kind', label: 'Checkout 类型检测' },
  { value: 'registration-error', label: '注册错误' }
]

export const REGISTRATION_OUTCOMES: Record<string, { label: string; color?: string }> = {
  eligible: { label: '有试用资格', color: 'success' },
  ineligible: { label: '无试用资格', color: 'error' },
  unknown: { label: '未知', color: 'warning' },
  disabled: { label: '未开启检查' },
  oaics: { label: 'oaics', color: 'cyan' },
  cs_live: { label: 'cs_live', color: 'success' },
  cs_test: { label: 'cs_test', color: 'blue' },
  error: { label: '错误', color: 'error' },
  exception: { label: '异常', color: 'error' },
  worker_exception: { label: '工作线程异常', color: 'error' },
  session_save_failed: { label: '会话保存失败', color: 'error' }
}

export const OUTCOMES_BY_STAGE: Record<RegistrationStage, string[]> = {
  'plus-trial': ['eligible', 'ineligible', 'unknown'],
  'checkout-kind': ['oaics', 'cs_live', 'cs_test', 'unknown', 'disabled'],
  'registration-error': ['error', 'exception', 'worker_exception', 'session_save_failed']
}
