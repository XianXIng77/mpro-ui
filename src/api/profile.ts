import { request } from '@/utils/request'
import type { Appearance, Profile } from '@/types/workspace'

export interface ProfilePreferences {
  notices: { product: boolean; security: boolean; digest: boolean }
  appearance: Appearance
}

export interface UserProfile extends Profile {
  userId: number
  role: string
  preferences: ProfilePreferences
}

export type ProfileInput = Pick<Profile, 'username' | 'phone' | 'bio' | 'avatar' | 'avatarColor'>
export interface ProfileActivity { id: string; action: string; module: string; detail: string; time: string; status: string }

export const profileApi = {
  get() { return request<UserProfile>({ url: '/profile' }) },
  update(data: ProfileInput) { return request<UserProfile>({ url: '/profile', method: 'PUT', data }) },
  preferences() { return request<ProfilePreferences>({ url: '/profile/preferences' }) },
  savePreferences(data: ProfilePreferences) {
    return request<ProfilePreferences>({ url: '/profile/preferences', method: 'PUT', data })
  },
  changePassword(currentPassword: string, newPassword: string) {
    return request<void>({ url: '/profile/password', method: 'PUT', data: { currentPassword, newPassword } })
  },
  activities() { return request<ProfileActivity[]>({ url: '/profile/activities' }) }
}
