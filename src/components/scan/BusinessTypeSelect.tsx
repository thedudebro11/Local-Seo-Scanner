import { Select } from '../ui/Select'
import type { BusinessType } from '@engine/types/audit'

interface Props {
  value: BusinessType
  onChange: (value: BusinessType) => void
  disabled?: boolean
}

const BUSINESS_TYPE_OPTIONS = [
  { value: 'auto',        label: 'Auto-detect' },
  { value: 'restaurant',  label: 'Restaurant / Food' },
  { value: 'salon',       label: 'Salon / Spa / Beauty' },
  { value: 'roofer',      label: 'Roofer / Roofing' },
  { value: 'auto_shop',   label: 'Auto Shop / Mechanic' },
  { value: 'contractor',  label: 'Contractor / Trades' },
  { value: 'dentist',     label: 'Dentist / Medical' },
  { value: 'other',       label: 'Other Local Business' },
]

export function BusinessTypeSelect({ value, onChange, disabled }: Props): JSX.Element {
  return (
    <Select
      label="Business Type"
      value={value}
      options={BUSINESS_TYPE_OPTIONS}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as BusinessType)}
    />
  )
}
