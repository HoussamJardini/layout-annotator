import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useModeStore = create(
  persist(
    (set) => ({
      mode: null, // null | 'document' | 'object'
      setMode: (mode) => set({ mode }),
      resetMode: () => set({ mode: null }),
    }),
    { name: 'annotator_mode' }
  )
)
