export interface PreparedEmailContent {
  htmlDocument: string
  plainText: string
  verificationCode: string
}

export function extractVerificationCode(text: string): string {
  const labels = /验证码|校验码|动态码|一次性密码|安全码|提取码|verification\s*code|security\s*code|one[\s-]*time\s*(?:code|password)|passcode|\botp\b/gi
  const candidates = /(?:^|[^A-Za-z0-9])([A-Z0-9]{4,8})(?=$|[^A-Za-z0-9])/gi

  for (const label of text.matchAll(labels)) {
    const after = text.slice((label.index || 0) + label[0].length, (label.index || 0) + label[0].length + 100)
    for (const candidate of after.matchAll(candidates)) {
      if (/\d/.test(candidate[1])) return candidate[1]
    }
    const before = text.slice(Math.max(0, (label.index || 0) - 35), label.index)
    const preceding = [...before.matchAll(candidates)].filter(candidate => /\d/.test(candidate[1]))
    if (preceding.length) return preceding[preceding.length - 1][1]
  }
  return ''
}

export function prepareEmailContent(content?: string, contentType?: string, preview?: string): PreparedEmailContent {
  const body = content || preview || ''
  if (contentType?.toLowerCase() !== 'html' || !content) {
    const plainText = body || '暂无正文'
    return { htmlDocument: '', plainText, verificationCode: extractVerificationCode(plainText) }
  }

  const doc = new DOMParser().parseFromString(content, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed, form, base, meta[http-equiv="refresh"], link[rel="stylesheet"]')
    .forEach(element => element.remove())

  const visibleText = doc.body.textContent || ''
  if (!doc.body.innerHTML.trim()) {
    const plainText = preview || '暂无正文'
    return { htmlDocument: '', plainText, verificationCode: extractVerificationCode(plainText) }
  }

  doc.querySelectorAll('*').forEach(element => {
    for (const attribute of [...element.attributes]) {
      if (attribute.name.toLowerCase().startsWith('on')) element.removeAttribute(attribute.name)
    }
  })

  doc.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href')?.trim() || ''
    if (/^\/\/[^/]/.test(href)) link.setAttribute('href', `https:${href}`)
    else if (!/^(https?:|mailto:)/i.test(href)) link.removeAttribute('href')
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
  })

  const policy = doc.createElement('meta')
  policy.setAttribute('http-equiv', 'Content-Security-Policy')
  policy.setAttribute('content', "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:;")
  doc.head.prepend(policy)

  const base = doc.createElement('base')
  base.setAttribute('target', '_blank')
  doc.head.append(base)

  const style = doc.createElement('style')
  style.textContent = 'html,body{margin:0;max-width:100%;overflow-wrap:anywhere}body{padding:20px;font:14px/1.6 Arial,sans-serif}img,table{max-width:100%}'
  doc.head.append(style)

  return {
    htmlDocument: '<!doctype html>\n' + doc.documentElement.outerHTML,
    plainText: '',
    verificationCode: extractVerificationCode(visibleText) || extractVerificationCode(preview || '')
  }
}
