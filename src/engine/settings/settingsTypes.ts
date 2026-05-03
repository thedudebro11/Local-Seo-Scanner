export type Currency = 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD'

export interface CurrencyConfig {
  symbol: string
  multiplier: number  // relative to USD
  label: string
}

export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  USD: { symbol: '$',    multiplier: 1.00, label: 'US Dollar (USD)' },
  GBP: { symbol: '£',    multiplier: 0.79, label: 'British Pound (GBP)' },
  EUR: { symbol: '€',    multiplier: 0.92, label: 'Euro (EUR)' },
  CAD: { symbol: 'CA$',  multiplier: 1.36, label: 'Canadian Dollar (CAD)' },
  AUD: { symbol: 'A$',   multiplier: 1.53, label: 'Australian Dollar (AUD)' },
}

export interface AppSettings {
  agencyName: string
  agencyLogoBase64: string  // data URI (e.g. "data:image/png;base64,...") or empty string
  currency: Currency
}

export const DEFAULT_SETTINGS: AppSettings = {
  agencyName: '',
  agencyLogoBase64: '',
  currency: 'USD',
}
