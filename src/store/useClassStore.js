import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_CLASSES = [
  { id: 1, name: 'text_block',  color: '#3498db', shortcut: '1', description: 'Paragraph or body text' },
  { id: 2, name: 'title',       color: '#9b59b6', shortcut: '2', description: 'Main title or heading' },
  { id: 3, name: 'table',       color: '#e67e22', shortcut: '3', description: 'Full table element' },
  { id: 4, name: 'table_cell',  color: '#f39c12', shortcut: '4', description: 'Individual table cell' },
  { id: 5, name: 'header',      color: '#1abc9c', shortcut: '5', description: 'Page header area' },
  { id: 6, name: 'footer',      color: '#16a085', shortcut: '6', description: 'Page footer area' },
  { id: 7, name: 'figure',      color: '#e74c3c', shortcut: '7', description: 'Image or chart' },
  { id: 8, name: 'signature',   color: '#c0392b', shortcut: '8', description: 'Signature field' },
  { id: 9, name: 'date',        color: '#27ae60', shortcut: '9', description: 'Date field' },
  { id: 10, name: 'amount',     color: '#2ecc71', shortcut: '0', description: 'Monetary amount' },
  { id: 11, name: 'logo',       color: '#34495e', shortcut: null, description: 'Company logo' },
]

let nextId = DEFAULT_CLASSES.length + 1

export const useClassStore = create(
  persist(
    (set, get) => ({
      classes: DEFAULT_CLASSES,
      activeClassId: 1,

      setActiveClass: (id) => set({ activeClassId: id }),

      addClass: (cls) => set((s) => ({
        classes: [...s.classes, { ...cls, id: nextId++ }]
      })),

      updateClass: (id, patch) => set((s) => ({
        classes: s.classes.map(c => c.id === id ? { ...c, ...patch } : c)
      })),

      deleteClass: (id) => set((s) => ({
        classes: s.classes.filter(c => c.id !== id),
        activeClassId: s.activeClassId === id ? (s.classes[0]?.id ?? null) : s.activeClassId
      })),

      getActiveClass: () => {
        const s = get()
        return s.classes.find(c => c.id === s.activeClassId) ?? s.classes[0]
      },

      getClassById: (id) => get().classes.find(c => c.id === id),

      importClasses: (classes) => set({ classes }),

      resetClasses: () => set({ classes: DEFAULT_CLASSES, activeClassId: 1 }),
    }),
    { name: 'annotator:classes' }
  )
)
