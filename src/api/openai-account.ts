import { request } from '@/utils/request'

export interface OpenAiAccount {
  id: number
  mailAccountId: number | null
  email: string
  registeredAt: string
  checkedAt: string | null
  trial: 'eligible' | 'ineligible' | 'unknown'
  trialReason: string
  checkout: string
  checkoutReason: string
  paymentStatus: 'detected' | 'unknown' | 'error' | 'none'
  payments: string[]
  country: string
  currency: string
  hasAccessToken: boolean
  hasPassword: boolean
}

export interface OpenAiAccountCredentials {
  id: number
  accessToken: string | null
  password: string | null
}

export const openAiAccountApi = {
  list(params: { pageNum: number; pageSize: number; keyword: string; trial: string; checkout: string; payment: string }) {
    return request<{ total: number; rows: OpenAiAccount[] }>({ url: '/openai-accounts', params })
  },
  summary() {
    return request<{ total: number; eligible: number; tokens: number }>({ url: '/openai-accounts/summary' })
  },
  credentials(ids: number[]) {
    return request<OpenAiAccountCredentials[]>({ url: '/openai-accounts/credentials', params: { ids: ids.join(',') } })
  }
}
