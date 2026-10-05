import { applyAccess } from '@/utils/access'
import type { AccessSnapshot } from '@/api/access'
import { request } from '@/utils/request'
import { AuthUser, clearAuthToken, getAuthorization, IssuedToken, saveAuthToken } from '@/utils/auth-token'

export interface LoginResponse extends IssuedToken {
  user: AuthUser
  access: AccessSnapshot
}

export async function login(email: string, password: string, remember = false): Promise<LoginResponse> {
  const result = await request<LoginResponse>({
    url: '/auth/login',
    method: 'POST',
    data: { email, password }
  })
  saveAuthToken(result, remember)
  applyAccess(result.access)
  return result
}

export async function register(data: { username: string; inviteCode: string; email: string; password: string }, remember = false): Promise<LoginResponse> {
  const result = await request<LoginResponse>({ url: '/auth/register', method: 'POST', data })
  saveAuthToken(result, remember)
  applyAccess(result.access)
  return result
}

export async function logout(): Promise<void> {
  const authorization = getAuthorization()
  try {
    await request<void>({ url: '/auth/logout', method: 'POST' })
  } finally {
    if (getAuthorization() === authorization) clearAuthToken()
  }
}
