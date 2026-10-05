export type RegistrationTarget = 'openai' | 'grok'
export type RegistrationStage = 'plus-trial' | 'checkout-kind' | 'registration-error'

export interface RegistrationLogSummary {
  id: string
  time: string
  email: string
  registrationTarget: RegistrationTarget
  stage: RegistrationStage
  outcome: string
}

export interface RegistrationLog extends RegistrationLogSummary {
  logText: string
  screenshot: string
}
