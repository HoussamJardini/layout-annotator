import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSessionStore = create(
  persist(
    (set, get) => ({
      folderName:   null,
      fileTree:     [],
      flatQueue:    [],
      currentIdx:   0,
      expandedDirs: {},

      setFileTree: (folderName, tree, flat) => set({
        folderName,
        fileTree: tree,
        flatQueue: flat,
        currentIdx: 0,
        expandedDirs: {},
      }),

      setCurrentIdx: (idx) => set({ currentIdx: Math.max(0, idx) }),

      nextFile: () => set((s) => ({
        currentIdx: Math.min(s.currentIdx + 1, s.flatQueue.length - 1)
      })),

      prevFile: () => set((s) => ({
        currentIdx: Math.max(s.currentIdx - 1, 0)
      })),

      toggleDir: (path) => set((s) => ({
        expandedDirs: { ...s.expandedDirs, [path]: !s.expandedDirs[path] }
      })),

      getCurrentFile: () => {
        const s = get()
        return s.flatQueue[s.currentIdx] ?? null
      },

      clearSession: () => set({
        folderName: null,
        fileTree: [],
        flatQueue: [],
        currentIdx: 0,
        expandedDirs: {},
      }),
    }),
    {
      name: 'annotator:session',
      // Never persist handles — FileSystemFileHandle cannot be serialized
      partialize: (s) => ({
        folderName:   s.folderName,
        currentIdx:   s.currentIdx,
        expandedDirs: s.expandedDirs,
      }),
      // After rehydration, clear stale queue so user must re-open folder
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.fileTree  = []
          state.flatQueue = []
        }
      },
    }
  )
)