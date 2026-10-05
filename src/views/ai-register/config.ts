export const MAX_REGISTRATION_ACCOUNTS = 1000

export const MAIL_SOURCES = [
  { value: 'mailbox', label: '邮箱管理' }
]

export const PROXY_STRATEGIES = [
  { value: 'round_robin', label: '轮流使用' },
  { value: 'random', label: '随机分配' },
  { value: 'sticky', label: '固定使用第一条' }
]

export function createConfig() {
  return {
    mailSource: 'mailbox', quantity: 20, concurrency: 3, intervalSeconds: 2,
    stepDelaySeconds: 3, headless: true, proxy: '', proxyStrategy: 'round_robin',
    checkoutEnabled: false, checkoutProxy: '', checkoutProxyStrategy: 'round_robin',
    paymentEnabled: true
  }
}

export type RegistrationConfig = ReturnType<typeof createConfig>

/** 仅检查输入格式，不连接代理，也不记录或持久化代理凭据。 */
export function proxyError(text: string): string {
  const lines = text.split(/\r?\n/)
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim()
    if (!line) continue
    const shorthand = line.match(/^(?:(https?|socks5):\/\/)?([^:@/]+):(\d+):([^:@]+):(.+)$/)
    const address = shorthand
      ? `${shorthand[1] || 'http'}://${encodeURIComponent(shorthand[4])}:${encodeURIComponent(shorthand[5])}@${shorthand[2]}:${shorthand[3]}`
      : line.includes('://') ? line : `http://${line}`
    try {
      const url = new URL(address)
      const port = url.port || (url.protocol === 'http:' ? '80' : url.protocol === 'https:' ? '443' : '')
      if (!['http:', 'https:', 'socks5:'].includes(url.protocol) || !url.hostname || !/:\d+\/?$/.test(address) || Number(port) < 1 || Number(port) > 65535 || url.search || url.hash || !['', '/'].includes(url.pathname)) throw new Error()
    } catch {
      return `第 ${index + 1} 行代理格式不正确，请填写有效的地址和端口`
    }
  }
  return ''
}

