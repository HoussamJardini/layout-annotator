import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// A FileNode = { type: 'file'|'folder', name, path, children?, page? }

export const useSessionStore = create(
  persist(
    (set, get) => ({
      folderName:  null,
      fileTree:    [],       // nested FileNode[]
      flatQueue:   [],       // flat list of { fileName, folder, page, sourceType }
      currentIdx:  0,
      expandedDirs: {},      // { [path]: bool }

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
    { name: 'annotator:session' }
  )
)
