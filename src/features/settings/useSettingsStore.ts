import { create } from 'zustand'
import type { AppSettings } from '@engine/settings/settingsTypes'
import { DEFAULT_SETTINGS } from '@engine/settings/settingsTypes'

interface SettingsStore {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  save: (partial: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,

  load: async (): Promise<void> => {
    if (get().loaded) return
    try {
      const s = await window.api.getSettings()
      set({ settings: s, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  save: async (partial: Partial<AppSettings>): Promise<void> => {
    try {
      const updated = await window.api.saveSettings(partial)
      set({ settings: updated })
    } catch {
      // optimistic update so the UI stays responsive even if IPC fails
      set((state) => ({ settings: { ...state.settings, ...partial } }))
    }
  },
}))
