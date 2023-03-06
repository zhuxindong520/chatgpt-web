import { ss } from '@/utils/storage'

const LOCAL_NAME = 'userStorage'

export interface UserInfo {
  avatar: string
  name: string
  description: string
  donate: string
}

export interface UserState {
  userInfo: UserInfo
}

export function defaultSetting(): UserState {
  return {
    userInfo: {
      avatar: 'https://im.geekcloud.cf/file/a1458af7daa4b627647ac.png',
      name: 'zhuxindong',
      description: 'Star on <a href="https://github.com/zhuxindong/chatgpt-web" class="text-blue-500" target="_blank" >Github</a>',
      donate: '<a href="https://im.geekcloud.cf/file/6b6087f8a88b99809c857.png" class="text-blue-500" target="_blank" >喜欢的话捐助一下吧</a>',
    },
  }
}

export function getLocalState(): UserState {
  const localSetting: UserState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: UserState): void {
  ss.set(LOCAL_NAME, setting)
}
