import { reactive } from 'vue'
import { accessApi, AccessSnapshot } from '@/api/access'
import { getAuthorization } from '@/utils/auth-token'

export const accessState = reactive({ snapshot: null as AccessSnapshot | null })
let loadedFor: string | null = null
let pending: { authorization: string; promise: Promise<void> } | null = null

export function applyAccess(snapshot: AccessSnapshot): void {
  const authorization = getAuthorization()
  // 相同授权无需重复更新组件。
  if (loadedFor === authorization && JSON.stringify(accessState.snapshot) === JSON.stringify(snapshot)) return
  loadedFor = authorization
  accessState.snapshot = snapshot
}

export function clearAccess(): void {
  loadedFor = null
  pending = null
  accessState.snapshot = null
}

/** 合并同一账号的并发查询，忽略退出或切换账号之前的响应。 */
export async function loadAccess(force = false): Promise<void> {
  const authorization = getAuthorization()
  if (!authorization) { clearAccess(); return }
  if (!force && loadedFor === authorization && accessState.snapshot) return
  if (pending?.authorization === authorization) return pending.promise
  const task = accessApi.current().then(snapshot => {
    if (getAuthorization() === authorization) applyAccess(snapshot)
  }).catch(error => {
    if (getAuthorization() === authorization) clearAccess()
    throw error
  }).finally(() => { if (pending?.promise === task) pending = null })
  pending = { authorization, promise: task }
  return task
}

export function hasPermission(code: string): boolean {
  return loadedFor === getAuthorization() && !!accessState.snapshot?.permissions.includes(code)
}

