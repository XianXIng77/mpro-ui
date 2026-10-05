import type { MailRegistrationAccount } from '@/api/mail'

/** 注册任务展示模型；账号来自后端，执行步骤仍用于演示。 */
export type TaskStatus = 'waiting' | 'running' | 'success' | 'error'
export type LogLevel = 'info' | 'success' | 'error'
export interface RegistrationTask {
  id: number
  email: string
  status: TaskStatus
  step: number
  elapsed: number
  attempt: number
}
export interface RegistrationEvent {
  id: number
  time: string
  email: string
  level: LogLevel
  text: string
}
export const REGISTRATION_STEPS = ['准备邮箱', '创建账号', '等待验证码', '完成验证', '保存结果']
export const TASK_STATES: Record<TaskStatus, { label: string; color?: string }> = {
  waiting: { label: '等待中' }, running: { label: '注册中', color: 'processing' },
  success: { label: '注册成功', color: 'success' }, error: { label: '注册失败', color: 'error' }
}
export function createTasks(accounts: MailRegistrationAccount[]): RegistrationTask[] {
  return accounts.map(account => ({
    id: account.accountId, email: account.email, status: 'waiting', step: 0, elapsed: 0, attempt: 0
  }))
}
