import { request } from '@/utils/request'
import type { RegistrationLog, RegistrationLogSummary } from '@/types/registration-log'

export interface RegistrationLogPage {
  total: number
  rows: RegistrationLogSummary[]
}

export const registrationLogApi = {
  list(params: {
    pageNum: number
    pageSize: number
    keyword?: string
    registrationTarget?: string
    outcome?: string
  }) {
    return request<RegistrationLogPage>({ url: '/registration-logs', params })
  },
  detail(id: string) {
    return request<RegistrationLog>({ url: `/registration-logs/${encodeURIComponent(id)}` })
  }
}
