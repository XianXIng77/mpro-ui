import { request } from '@/utils/request'

export type InviteStatus = 'valid' | 'used' | 'invalid'

export interface InviteCode {
  code: string
  createdAt: string
  uses: number
  maxUses: number
  lastUsedAt?: string | null
  enabled: boolean
  status: InviteStatus
}

export interface InviteCodePage {
  total: number
  rows: InviteCode[]
}

export type InviteCodeUpdate =
  | { maxUses: number; enabled?: never }
  | { enabled: false; maxUses?: never }

const baseUrl = '/invite-codes'

export const inviteCodeApi = {
  list(params: { pageNum: number; pageSize: number; keyword?: string; status?: string }) {
    return request<InviteCodePage>({ url: baseUrl, params })
  },
  generate(count: number, maxUses: number) {
    return request<InviteCode[]>({ url: baseUrl, method: 'POST', data: { count, maxUses } })
  },
  update(code: string, data: InviteCodeUpdate) {
    return request<InviteCode>({
      url: `${baseUrl}/${encodeURIComponent(code)}`,
      method: 'PUT',
      data
    })
  },
  remove(code: string) {
    return request<void>({ url: `${baseUrl}/${encodeURIComponent(code)}`, method: 'DELETE' })
  },
  export(codes: string[]) {
    return request<string[]>({ url: `${baseUrl}/export`, method: 'POST', data: { codes } })
  }
}