const TOKEN_STORAGE_KEY = 'mpro.auth.token'
export const ACCESS_INVALIDATED_EVENT = 'mpro-access-invalidated'
export const AUTH_CHANGED_EVENT = 'mpro-auth-changed'

export interface IssuedToken {
  tokenName: string
  tokenType: string
  tokenValue: string
  expiresIn: number
}

export interface AuthUser {
  userId: number
  email: string
  role: string
}

interface StoredToken {
  tokenType: string
  tokenValue: string
  expiresAt: number | null
  user?: AuthUser
}

export function saveAuthToken(token: IssuedToken & { user: AuthUser }, remember = false): void {
  if (token.tokenName !== 'Authorization' || token.tokenType !== 'Bearer' || !token.tokenValue ||
      !Number.isFinite(token.expiresIn) || (token.expiresIn <= 0 && token.expiresIn !== -1)) {
    throw new Error('登录服务返回的令牌格式不正确')
  }

  const stored: StoredToken = {
    tokenType: token.tokenType,
    tokenValue: token.tokenValue,
    expiresAt: token.expiresIn > 0 ? Date.now() + token.expiresIn * 1000 : null,
    user: token.user
  }
  const storage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage
  storage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(stored))
  otherStorage.removeItem(TOKEN_STORAGE_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

function readToken(): StoredToken | null {
  const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!raw) return null

  try {
    const token = JSON.parse(raw) as StoredToken
    if (token.tokenType !== 'Bearer' || typeof token.tokenValue !== 'string' || !token.tokenValue ||
        (token.expiresAt !== null &&
          (typeof token.expiresAt !== 'number' || !Number.isFinite(token.expiresAt) || token.expiresAt <= Date.now()))) {
      clearAuthToken()
      return null
    }
    return token
  } catch {
    clearAuthToken()
    return null
  }
}

export function getAuthorization(): string | null {
  const token = readToken()
  return token ? `${token.tokenType} ${token.tokenValue}` : null
}

export function getAuthUser(): AuthUser | null {
  return readToken()?.user || null
}

export function getAuthExpiresAt(): number | null {
  return readToken()?.expiresAt ?? null
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}
