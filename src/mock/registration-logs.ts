import { REGISTRATION_OUTCOMES, REGISTRATION_STAGES } from '@/constants/registration-log'
import type { RegistrationLog, RegistrationStage, RegistrationTarget } from '@/types/registration-log'

// 独立的演示数据，后续接入接口时替换此数据来源即可。
const scenarios: Array<{
  stage: RegistrationStage
  outcome: string
  target: RegistrationTarget
  detail: string
  screenshot?: string
}> = [
  { stage: 'plus-trial', outcome: 'eligible', target: 'openai', detail: '检查完成，当前账号有 Plus 试用资格。', screenshot: 'openai/demo-plus-trial/screenshot.png' },
  { stage: 'registration-error', outcome: 'error', target: 'grok', detail: '等待邮箱验证码超时（60 秒），本次注册已停止。', screenshot: 'grok/demo-registration-error/screenshot.png' },
  { stage: 'checkout-kind', outcome: 'oaics', target: 'openai', detail: '检测到 Checkout 会话类型：oaics。', screenshot: 'openai/demo-checkout-kind/screenshot.png' },
  { stage: 'plus-trial', outcome: 'ineligible', target: 'openai', detail: '检查完成，当前账号无 Plus 试用资格。' },
  { stage: 'checkout-kind', outcome: 'cs_live', target: 'openai', detail: '检测到 Checkout 会话类型：cs_live。' },
  { stage: 'registration-error', outcome: 'exception', target: 'grok', detail: '页面连接中断，浏览器会话已结束。' },
  { stage: 'plus-trial', outcome: 'unknown', target: 'openai', detail: '页面未返回可识别的试用信息，检查结果标记为未知。' },
  { stage: 'checkout-kind', outcome: 'disabled', target: 'openai', detail: '未开启 Checkout 检查，已跳过此步骤。' },
  { stage: 'registration-error', outcome: 'worker_exception', target: 'grok', detail: '执行任务时工作线程异常退出，当前任务已终止。' },
  { stage: 'registration-error', outcome: 'session_save_failed', target: 'openai', detail: '会话保存失败，未生成可用会话文件。' },
  { stage: 'checkout-kind', outcome: 'cs_test', target: 'openai', detail: '检测到 Checkout 会话类型：cs_test。' },
  { stage: 'checkout-kind', outcome: 'unknown', target: 'openai', detail: '页面未返回可识别的 Checkout 类型，结果标记为未知。' }
]

export function createRegistrationLogs(): RegistrationLog[] {
  return Array.from({ length: 24 }, (_, index) => {
    const scenario = scenarios[index % scenarios.length]
    const serial = String(index + 1).padStart(2, '0')
    const time = `2026-09-${index < 12 ? '29' : '28'} ${String(14 - Math.floor(index % 12 / 4)).padStart(2, '0')}:${String(56 - index % 4 * 12).padStart(2, '0')}:08`
    const email = `demo.user${serial}@example.com`
    const stage = REGISTRATION_STAGES.find(item => item.value === scenario.stage)?.label || scenario.stage
    const result = REGISTRATION_OUTCOMES[scenario.outcome].label
    const level = scenario.stage === 'registration-error' ? 'ERROR' : ['unknown', 'ineligible'].includes(scenario.outcome) ? 'WARN' : 'INFO'
    return {
      id: `demo-event-${serial}`,
      time,
      email,
      registrationTarget: scenario.target,
      stage: scenario.stage,
      outcome: scenario.outcome,
      screenshot: scenario.screenshot ? `${process.env.BASE_URL}log/${scenario.screenshot}` : '',
      logText: [
        `[${time}] [INFO] 事件：demo-event-${serial}`,
        `[${time}] [INFO] 注册目标：${scenario.target === 'openai' ? 'OpenAI（ChatGPT）' : 'Grok（xAI）'}`,
        `[${time}] [INFO] 邮箱：${email}`,
        `[${time}] [INFO] 当前阶段：${stage}`,
        `[${time}] [${level}] ${scenario.detail}`,
        `[${time}] [INFO] 记录结果：${result}`,
        `[${time}] [INFO] ${scenario.screenshot ? '已保存事件截图。' : '本事件未保存截图。'}`
      ].join('\n')
    }
  })
}
