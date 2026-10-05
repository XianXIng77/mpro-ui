import { request } from '@/utils/request'
import type { AccessRole, AccessUser } from '@/types/workspace'

export interface AccessSnapshot { userId: number; role: string; permissions: string[] }
export interface AccessMember extends AccessUser { userId: number; permissions: string[] }
export interface AccessOverview { roles: AccessRole[]; users: AccessMember[]; publicMailEnabled: boolean }
export const accessApi = {
  current() { return request<AccessSnapshot>({ url: '/access/current' }) },
  overview() { return request<AccessOverview>({ url: '/access' }) },
  updateRole(role: AccessRole) {
    return request<void>({ url: '/access/roles/' + role.key, method: 'PUT', data: { permissions: role.permissions } })
  },
  updateUser(user: AccessMember) {
    const { role, extraPermissions, removedPermissions } = user
    return request<void>({ url: '/access/users/' + user.userId, method: 'PUT', data: { role, extraPermissions, removedPermissions } })
  },
  transferOwner(userId: number) { return request<void>({ url: '/access/owner/' + userId, method: 'POST' }) },
  updatePublicMailPolicy(enabled: boolean) {
    return request<void>({ url: '/access/policies/public-mail', method: 'PUT', data: { enabled } })
  }
}

