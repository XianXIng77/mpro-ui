import type { PermissionModule, Permission } from '@/types/workspace'

export const PERMISSION_MODULES: PermissionModule[] = [
  { key: 'dashboard', label: '数据仪表盘' },
  { key: 'email', label: '邮箱管理' },
  { key: 'register', label: 'AI注册' },
  { key: 'invite', label: '邀请码' },
  { key: 'logs', label: '注册日志' },
  { key: 'audit', label: '操作审计' },
  { key: 'access', label: '权限中心' },
  { key: 'profile', label: '个人中心' }
]

export const ACCESS_PERMISSIONS: Permission[] = [
  { code: 'dashboard:view', label: '查看数据仪表盘', group: '数据仪表盘' },
  { code: 'email:view', label: '查询邮箱', group: '邮箱管理' },
  { code: 'email:messages', label: '查询收件邮件', group: '邮箱管理' },
  { code: 'email:detail', label: '查询邮件详情', group: '邮箱管理' },
  { code: 'email:refresh', label: '刷新 Token', group: '邮箱管理' },
  { code: 'email:create', label: '新增邮箱', group: '邮箱管理' },
  { code: 'email:delete', label: '删除邮箱', group: '邮箱管理' },
  { code: 'register:view', label: '查看 AI 注册', group: 'AI注册' },
  { code: 'register:config', label: '修改注册配置', group: 'AI注册' },
  { code: 'register:run', label: '执行注册任务', group: 'AI注册' },
  { code: 'register:resource', label: '管理注册资源', group: 'AI注册' },
  { code: 'register:token:read', label: '查看注册 Token', group: 'AI注册' },
  { code: 'invite:view', label: '查询邀请码', group: '邀请码' },
  { code: 'invite:create', label: '生成邀请码', group: '邀请码' },
  { code: 'invite:update', label: '修改邀请码', group: '邀请码' },
  { code: 'invite:delete', label: '销毁邀请码', group: '邀请码' },
  { code: 'invite:export', label: '导出邀请码', group: '邀请码' },
  { code: 'logs:view', label: '查看注册日志', group: '日志审计' },
  { code: 'logs:create', label: '写入注册日志', group: '日志审计' },
  { code: 'audit:export', label: '导出操作审计', group: '日志审计' },
  { code: 'audit:view', label: '查看操作审计', group: '日志审计' },
  { code: 'profile:update', label: '修改个人资料', group: '个人中心' },
  { code: 'access:manage', label: '管理角色与权限', group: '系统管理' }
]

export const AUDIT_ACTIONS = ['登录', '退出登录', '注册', '新增', '执行', '修改', '修改个人资料', '修改密码', '删除', '导出', '权限变更', '转移站主']
export const AVATAR_COLORS = ['#1677ff', '#722ed1', '#389e0d', '#d46b08', '#c41d7f']
