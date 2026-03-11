/**
 * Screenshot utility.
 * Takes a screenshot of an already-loaded Playwright page and saves it to disk.
 * Returns the absolute path on success, undefined on failure.
 */

import type { Page } from 'playwright'
import fs from 'fs-extra'
import path from 'path'
import { createLogger } from '../utils/logger'

const log = createLogger('captureScreenshots')

/**
 * Capture a full-width, viewport-height screenshot of the current page.
 * @param page         - Playwright Page (must be already navigated)
 * @param screenshotDir - Directory to save the PNG
 * @param label        - Filename stem (e.g. 'homepage' → 'homepage.png')
 * @returns Absolute path of the saved file, or undefined if capture failed.
 */
export async function takeScreenshot(
  page: Page,
  screenshotDir: string,
  label: string,
): Promise<string | undefined> {
  try {
    await fs.ensureDir(screenshotDir)
    const filename = `${label}.png`
    const filepath = path.join(screenshotDir, filename)
    await page.screenshot({ path: filepath, fullPage: false })
    log.info(`Screenshot saved: ${filepath}`)
    return filepath
  } catch (err) {
    log.warn(`Screenshot failed (${label}): ${(err as Error).message}`)
    return undefined
  }
}
