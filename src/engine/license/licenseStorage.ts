import fs from 'fs-extra'
import { getLicensePath } from './licensePaths'
import type { StoredLicense } from './licenseTypes'

export async function readLicense(): Promise<StoredLicense | null> {
  try {
    const p = getLicensePath()
    if (!(await fs.pathExists(p))) return null
    return (await fs.readJson(p)) as StoredLicense
  } catch {
    return null
  }
}

export async function writeLicense(license: StoredLicense): Promise<void> {
  await fs.writeJson(getLicensePath(), license, { spaces: 2 })
}

export async function deleteLicense(): Promise<void> {
  try {
    await fs.remove(getLicensePath())
  } catch {
    // ignore — file may not exist
  }
}
