/**
 * Lemon Squeezy license validator.
 *
 * Activate flow (first launch):
 *   POST /v1/licenses/activate → store key + instanceId
 *
 * Check flow (subsequent launches):
 *   POST /v1/licenses/validate with stored instanceId → update lastValidatedAt
 *   On network failure → allow 7-day offline grace period
 *
 * Deactivate flow:
 *   POST /v1/licenses/deactivate (best-effort) → delete local file
 */

import https from 'https'
import os from 'os'
import { readLicense, writeLicense, deleteLicense } from './licenseStorage'
import type { StoredLicense, LicenseActivateResult, LicenseCheckResult } from './licenseTypes'

const LS_HOST = 'api.lemonsqueezy.com'
const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000

// ─── Public API ───────────────────────────────────────────────────────────────

export async function activateLicense(key: string): Promise<LicenseActivateResult> {
  const instanceName = `${os.hostname()}-${os.platform()}`
  const trimmedKey = key.trim().toUpperCase()

  let body: LsActivateResponse
  try {
    body = (await lsPost('/v1/licenses/activate', {
      license_key: trimmedKey,
      instance_name: instanceName,
    })) as LsActivateResponse
  } catch (err) {
    return {
      success: false,
      error: `Could not reach activation server: ${(err as Error).message}`,
    }
  }

  if (!body.activated) {
    const msg = body.error ?? 'License activation failed. Check your key and try again.'
    return { success: false, error: msg }
  }

  const license: StoredLicense = {
    key: body.license_key.key,
    instanceId: body.instance.id,
    instanceName,
    activatedAt: new Date().toISOString(),
    lastValidatedAt: new Date().toISOString(),
    email: body.meta?.customer_email,
    customerName: body.meta?.customer_name,
    productName: body.meta?.product_name,
    variantName: body.meta?.variant_name,
    status: 'active',
  }

  await writeLicense(license)
  return { success: true, license }
}

export async function checkLicense(): Promise<LicenseCheckResult> {
  const stored = await readLicense()
  if (!stored) return { valid: false, license: null }

  try {
    const body = (await lsPost('/v1/licenses/validate', {
      license_key: stored.key,
      instance_id: stored.instanceId,
    })) as LsValidateResponse

    if (!body.valid) {
      await deleteLicense()
      return { valid: false, license: null }
    }

    const updated: StoredLicense = {
      ...stored,
      lastValidatedAt: new Date().toISOString(),
      status: 'active',
    }
    await writeLicense(updated)
    return { valid: true, license: updated }
  } catch {
    // Offline path — honour grace period
    const elapsed = Date.now() - new Date(stored.lastValidatedAt).getTime()
    const withinGrace = elapsed < OFFLINE_GRACE_MS
    return {
      valid: withinGrace,
      license: withinGrace ? stored : null,
      offlineGrace: withinGrace,
    }
  }
}

export async function deactivateLicense(): Promise<void> {
  const stored = await readLicense()
  if (stored) {
    lsPost('/v1/licenses/deactivate', {
      license_key: stored.key,
      instance_id: stored.instanceId,
    }).catch(() => {/* best-effort */})
  }
  await deleteLicense()
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function lsPost(path: string, payload: Record<string, string>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const req = https.request(
      {
        hostname: LS_HOST,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Accept': 'application/json',
        },
      },
      (res) => {
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error(`Invalid JSON from Lemon Squeezy (status ${res.statusCode})`))
          }
        })
      },
    )
    req.on('error', reject)
    req.setTimeout(10_000, () => req.destroy(new Error('Lemon Squeezy request timed out')))
    req.write(body)
    req.end()
  })
}

// ─── Lemon Squeezy response shapes (minimal) ─────────────────────────────────

interface LsActivateResponse {
  activated: boolean
  error?: string
  instance: { id: string; name: string }
  license_key: { key: string; status: string; activation_limit: number; activation_usage: number }
  meta?: {
    customer_email?: string
    customer_name?: string
    product_name?: string
    variant_name?: string
  }
}

interface LsValidateResponse {
  valid: boolean
  error?: string
}
