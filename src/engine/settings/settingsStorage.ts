import fs from 'fs-extra'
import { getSettingsPath } from './settingsPaths'
import { DEFAULT_SETTINGS } from './settingsTypes'
import type { AppSettings } from './settingsTypes'

export async function readSettings(): Promise<AppSettings> {
  try {
    const p = getSettingsPath()
    if (!(await fs.pathExists(p))) return { ...DEFAULT_SETTINGS }
    const stored = await fs.readJson(p) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...stored }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function writeSettings(settings: AppSettings): Promise<void> {
  await fs.writeJson(getSettingsPath(), settings, { spaces: 2 })
}

export async function mergeSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await readSettings()
  const merged = { ...current, ...partial }
  await writeSettings(merged)
  return merged
}
