import { reactive } from 'vue'
import type { ProfilePreferences } from '@/api/profile'

/** 当前账号的服务端偏好，供工作台页面共享；不保存模拟用户资料。 */
export const profilePreferences = reactive<ProfilePreferences>({
  notices: { product: true, security: true, digest: false },
  appearance: { mode: 'light', color: '#1677ff', compact: false }
})

export function applyProfilePreferences(value: ProfilePreferences): void {
  profilePreferences.notices = { ...value.notices }
  profilePreferences.appearance = { ...value.appearance }
}
