import { ACCESS_PERMISSIONS } from '@/constants/access'
import type { AccessRole, AccessUser } from '@/types/workspace'

export function resolvePermissions(user: AccessUser, role?: AccessRole): string[] {
  if (user.role === 'owner') return ACCESS_PERMISSIONS.map(item => item.code)
  const permissions = new Set([...(role?.permissions || []), ...user.extraPermissions])
  user.removedPermissions.forEach(value => permissions.delete(value))
  if (user.role !== 'admin') permissions.delete('access:manage')
  return [...permissions]
}

export function toggleUserPermission(user: AccessUser, role: AccessRole | undefined, code: string): AccessUser {
  const next = { ...user, extraPermissions: [...user.extraPermissions], removedPermissions: [...user.removedPermissions] }
  if (user.role === 'owner' || user.role === 'user' && code === 'access:manage') return next
  if (resolvePermissions(user, role).includes(code)) {
    next.extraPermissions = next.extraPermissions.filter(value => value !== code)
    if (!next.removedPermissions.includes(code)) next.removedPermissions.push(code)
  } else {
    next.removedPermissions = next.removedPermissions.filter(value => value !== code)
    if (!role?.permissions.includes(code) && !next.extraPermissions.includes(code)) next.extraPermissions.push(code)
  }
  return next
}
