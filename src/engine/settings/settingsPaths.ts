import path from 'path'

let _userDataPath: string | null = null

export function initSettingsDir(userDataPath: string): void {
  _userDataPath = userDataPath
}

export function getSettingsPath(): string {
  if (!_userDataPath) {
    throw new Error('settingsPaths: initSettingsDir() has not been called.')
  }
  return path.join(_userDataPath, 'settings.json')
}
