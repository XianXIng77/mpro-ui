import { request, requestBlob } from '@/utils/request'
import type { AuditRecord } from '@/types/workspace'

export interface OperationAuditQuery {
  pageNum?: number
  pageSize?: number
  keyword?: string
  action?: string
  status?: string
}

export interface OperationAuditSummary {
  today: number
  users: number
  success: number
  risks: number
}

export const operationAuditApi = {
  list(params: OperationAuditQuery) {
    return request<{ total: number; rows: AuditRecord[] }>({ url: '/operation-audits', params })
  },
  summary(params: OperationAuditQuery) {
    return request<OperationAuditSummary>({ url: '/operation-audits/summary', params })
  },
  detail(id: string) {
    return request<AuditRecord>({ url: `/operation-audits/${encodeURIComponent(id)}` })
  },
  export(params: OperationAuditQuery) {
    return requestBlob({ url: '/operation-audits/export', params })
  }
}
