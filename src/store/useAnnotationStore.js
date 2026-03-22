import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// annotations keyed by  "filename::page"
export const useAnnotationStore = create(
  persist(
    (set, get) => ({
      // { [fileKey]: Annotation[] }
      annotationMap: {},

      // { [fileKey]: { width, height, sourceType, folder, fileName, page } }
      imageMeta: {},

      selectedId: null,
      history: {},   // { [fileKey]: Annotation[][] }  for undo
      future:  {},   // { [fileKey]: Annotation[][] }  for redo

      // ── Helpers ──
      _key: (fileName, page = 0) => `${fileName}::${page}`,

      getAnnotations: (fileName, page = 0) => {
        const key = get()._key(fileName, page)
        return get().annotationMap[key] ?? []
      },

      setImageMeta: (fileName, page, meta) => set((s) => ({
        imageMeta: { ...s.imageMeta, [s._key(fileName, page)]: meta }
      })),

      // ── CRUD ──
      addAnnotation: (fileName, page, ann) => set((s) => {
        const key = s._key(fileName, page)
        const current = s.annotationMap[key] ?? []
        const newList = [...current, ann]
        const hist = s.history[key] ?? []
        return {
          annotationMap: { ...s.annotationMap, [key]: newList },
          history: { ...s.history, [key]: [...hist, current] },
          future:  { ...s.future,  [key]: [] },
          selectedId: ann.id,
        }
      }),

      updateAnnotation: (fileName, page, id, patch) => set((s) => {
        const key = s._key(fileName, page)
        const current = s.annotationMap[key] ?? []
        const hist = s.history[key] ?? []
        return {
          annotationMap: {
            ...s.annotationMap,
            [key]: current.map(a => a.id === id ? { ...a, ...patch } : a)
          },
          history: { ...s.history, [key]: [...hist, current] },
          future:  { ...s.future,  [key]: [] },
        }
      }),

      deleteAnnotation: (fileName, page, id) => set((s) => {
        const key = s._key(fileName, page)
        const current = s.annotationMap[key] ?? []
        const hist = s.history[key] ?? []
        return {
          annotationMap: {
            ...s.annotationMap,
            [key]: current.filter(a => a.id !== id)
          },
          history: { ...s.history, [key]: [...hist, current] },
          future:  { ...s.future,  [key]: [] },
          selectedId: s.selectedId === id ? null : s.selectedId,
        }
      }),

      setSelected: (id) => set({ selectedId: id }),

      // ── Undo / Redo ──
      undo: (fileName, page) => set((s) => {
        const key = s._key(fileName, page)
        const hist = [...(s.history[key] ?? [])]
        if (!hist.length) return {}
        const prev = hist.pop()
        const fut  = s.future[key] ?? []
        return {
          annotationMap: { ...s.annotationMap, [key]: prev },
          history: { ...s.history, [key]: hist },
          future:  { ...s.future,  [key]: [s.annotationMap[key] ?? [], ...fut] },
          selectedId: null,
        }
      }),

      redo: (fileName, page) => set((s) => {
        const key = s._key(fileName, page)
        const fut = [...(s.future[key] ?? [])]
        if (!fut.length) return {}
        const next = fut.shift()
        const hist = s.history[key] ?? []
        return {
          annotationMap: { ...s.annotationMap, [key]: next },
          history: { ...s.history, [key]: [...hist, s.annotationMap[key] ?? []] },
          future:  { ...s.future,  [key]: fut },
          selectedId: null,
        }
      }),

      clearAnnotations: (fileName, page) => set((s) => {
        const key = s._key(fileName, page)
        return {
          annotationMap: { ...s.annotationMap, [key]: [] },
          history: { ...s.history, [key]: [] },
          future:  { ...s.future,  [key]: [] },
          selectedId: null,
        }
      }),

      // Count annotations per file key (for file tree badge)
      countFor: (fileName, page = 0) => {
        const key = get()._key(fileName, page)
        return (get().annotationMap[key] ?? []).length
      },

      getAllData: () => get().annotationMap,
    }),
    { name: 'annotator:annotations' }
  )
)
