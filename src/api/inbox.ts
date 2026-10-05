import { request } from '@/utils/request'
import { normalizeEmailItem } from './mail'
import type { RawEmailItem } from './mail'

export interface InboxAccount {
  accountId: number
  email: string
}

const baseUrl = '/mail/inbox/accounts'

export const inboxApi = {
  account(accountId: number) {
    return request<InboxAccount>({ url: `${baseUrl}/${accountId}` })
  },
  async listEmails(accountId: number, top = 10) {
    const data = await request<{ value: RawEmailItem[]; '@odata.nextLink'?: string }>({
      url: `${baseUrl}/${accountId}/emails`, params: { top }
    })
    if (!Array.isArray(data?.value)) throw new Error('邮箱服务返回了无效的邮件列表')
    return { value: data.value.map(normalizeEmailItem), hasMore: !!data['@odata.nextLink'] }
  },
  async getEmail(accountId: number, messageId: string) {
    const data = await request<RawEmailItem>({
      url: `${baseUrl}/${accountId}/emails/detail`, params: { messageId }
    })
    return normalizeEmailItem(data)
  }
}
