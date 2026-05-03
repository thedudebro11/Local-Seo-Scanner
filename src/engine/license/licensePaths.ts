import path from 'path'

let _userDataPath: string | null = null

export function initLicenseDir(userDataPath: string): void {
  _userDataPath = userDataPath
}

export function getLicensePath(): string {
  if (!_userDataPath) {
    throw new Error('licensePaths: initLicenseDir() has not been called.')
  }
  return path.join(_userDataPath, 'license.json')
}
