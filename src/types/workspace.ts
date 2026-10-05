export interface PermissionModule { key: string; label: string }
export interface Permission { code: string; label: string; group: string }
export interface AccessRole { key: string; label: string; description: string; permissions: string[] }
export interface AccessUser { email: string; username: string; role: string; extraPermissions: string[]; removedPermissions: string[] }
export interface AuditRecord { id: string; user: string; email: string; action: string; module: string; detail: string; ip: string; country: string; location: string; device: string; time: string; status: '成功' | '失败'; risk: '普通' | '关注' | '高风险'; isp: string; timezone: string }
export interface Profile { username: string; email: string; phone: string; bio: string; avatar: string; avatarColor: string; joinedAt: string }
export interface Appearance { mode: 'light' | 'dark' | 'system'; color: string; compact: boolean }
