import { request } from '@/utils/request'

export interface MailAccount {
  accountId: number
  email: string
  openaiRegistrationStatus: 0 | 1 | 2
  createTime?: string
  lastRefreshedAt?: string | null
  remainingSeconds?: number | null
}

export interface MailRegistrationAccount {
  accountId: number
  email: string
}

export interface MailTokenRefresh {
  accountId: number
  lastRefreshedAt: string
  remainingSeconds: number
}

export interface MailImportResult {
  lineNo: number
  email?: string
  addStatus: number
  message: string
}

export interface EmailAddress {
  emailAddress: {
    address?: string
    name?: string
  }
}

export interface EmailItem {
  id: string
  subject?: string
  bodyPreview?: string
  body?: { content?: string; contentType?: string }
  from?: EmailAddress
  toRecipients?: EmailAddress[]
  ccRecipients?: EmailAddress[]
  receivedDateTime?: string
  isRead?: boolean
}

interface RawAddressFields {
  Address?: string
  Name?: string
  address?: string
  name?: string
}

interface RawEmailBody {
  Content?: string
  ContentType?: string
  content?: string
  contentType?: string
}

interface RawEmailAddress {
  EmailAddress?: RawAddressFields
  emailAddress?: RawAddressFields
}

export interface RawEmailItem {
  Id?: string
  id?: string
  Subject?: string
  subject?: string
  BodyPreview?: string
  bodyPreview?: string
  Body?: RawEmailBody
  body?: RawEmailBody
  From?: RawEmailAddress
  from?: RawEmailAddress
  ToRecipients?: RawEmailAddress[]
  toRecipients?: RawEmailAddress[]
  CcRecipients?: RawEmailAddress[]
  ccRecipients?: RawEmailAddress[]
  ReceivedDateTime?: string
  receivedDateTime?: string
  IsRead?: boolean
  isRead?: boolean
}

interface PageResult<T> {
  total: number
  rows: T[]
}

function normalizeAddress(raw?: RawEmailAddress): EmailAddress | undefined {
  if (!raw) return undefined
  const address = raw.EmailAddress ?? raw.emailAddress
  if (!address) return undefined
  return {
    emailAddress: {
      address: address.Address ?? address.address,
      name: address.Name ?? address.name
    }
  }
}

function normalizeAddresses(raw?: RawEmailAddress[]): EmailAddress[] {
  return Array.isArray(raw)
    ? raw.map(item => normalizeAddress(item)).filter((item): item is EmailAddress => !!item)
    : []
}

/** 后端透传 Outlook v2 的大驼峰字段；同时兼容小驼峰邮件字段。 */
export function normalizeEmailItem(raw: RawEmailItem): EmailItem {
  if (!raw || typeof raw !== 'object') throw new Error('邮箱服务返回了无效的邮件数据')
  const id = raw.Id ?? raw.id
  if (typeof id !== 'string' || !id) throw new Error('邮箱服务返回的邮件缺少 ID')
  const body = raw.Body ?? raw.body

  return {
    id,
    subject: raw.Subject ?? raw.subject,
    bodyPreview: raw.BodyPreview ?? raw.bodyPreview,
    body: body ? {
      content: body.Content ?? body.content,
      contentType: body.ContentType ?? body.contentType
    } : undefined,
    from: normalizeAddress(raw.From ?? raw.from),
    toRecipients: normalizeAddresses(raw.ToRecipients ?? raw.toRecipients),
    ccRecipients: normalizeAddresses(raw.CcRecipients ?? raw.ccRecipients),
    receivedDateTime: raw.ReceivedDateTime ?? raw.receivedDateTime,
    isRead: raw.IsRead ?? raw.isRead
  }
}

const baseUrl = '/mail/accounts'

export const mailApi = {
  registrationCandidates(source: string, count: number) {
    return request<MailRegistrationAccount[]>({ url: `${baseUrl}/registration-candidates`, params: { source, count } })
  },
  list(params: { pageNum: number; pageSize: number; email?: string }) {
    return request<PageResult<MailAccount>>({ url: baseUrl, params })
  },
  importAccounts(content: string) {
    return request<MailImportResult[]>({ url: `${baseUrl}/import`, method: 'POST', data: { content } })
  },
  refreshToken(accountId: number) {
    return request<MailTokenRefresh>({ url: `${baseUrl}/${accountId}/refresh-token`, method: 'POST' })
  },
  remove(accountId: number) {
    return request<void>({ url: `${baseUrl}/${accountId}`, method: 'DELETE' })
  },
  async listEmails(accountId: number, top = 10) {
    const data = await request<{ value: RawEmailItem[]; '@odata.nextLink'?: string }>({
      url: `${baseUrl}/${accountId}/emails`,
      params: { top }
    })
    if (!Array.isArray(data?.value)) throw new Error('邮箱服务返回了无效的邮件列表')
    return {
      value: data.value.map(normalizeEmailItem),
      hasMore: !!data['@odata.nextLink']
    }
  },
  async getEmail(accountId: number, messageId: string) {
    const data = await request<RawEmailItem>({
      url: `${baseUrl}/${accountId}/emails/detail`,
      params: { messageId }
    })
    return normalizeEmailItem(data)
  }
}
