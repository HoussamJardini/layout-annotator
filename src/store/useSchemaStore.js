import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_ANNOTATION_FIELDS = [
  { key: 'id',           type: 'number',  enabled: true,  locked: true,  description: 'Auto-incremented annotation ID' },
  { key: 'label',        type: 'string',  enabled: true,  locked: true,  description: 'Class label name' },
  { key: 'label_id',     type: 'number',  enabled: true,  locked: false, description: 'Numeric class ID' },
  { key: 'bbox',         type: 'array',   enabled: true,  locked: true,  description: '[x, y, width, height] in pixels' },
  { key: 'area',         type: 'number',  enabled: true,  locked: false, description: 'Bounding box area (w*h)' },
  { key: 'reading_order',type: 'number',  enabled: false, locked: false, description: 'Reading order index' },
  { key: 'confidence',   type: 'number',  enabled: false, locked: false, description: 'Annotation confidence 0-1' },
  { key: 'transcription',type: 'string',  enabled: false, locked: false, description: 'Text content inside box' },
  { key: 'notes',        type: 'string',  enabled: false, locked: false, description: 'Free-form notes' },
]

const DEFAULT_IMAGE_FIELDS = [
  { key: 'id',          type: 'number',  enabled: true,  locked: true },
  { key: 'file_name',   type: 'string',  enabled: true,  locked: true },
  { key: 'folder',      type: 'string',  enabled: true,  locked: false },
  { key: 'source_type', type: 'string',  enabled: true,  locked: false },
  { key: 'page',        type: 'number',  enabled: true,  locked: false },
  { key: 'width',       type: 'number',  enabled: true,  locked: true },
  { key: 'height',      type: 'number',  enabled: true,  locked: true },
]

const DEFAULT_METADATA = {
  dataset:     'my_dataset',
  version:     '1.0',
  author:      '',
  license:     'MIT',
  description: '',
  created_at:  new Date().toISOString().split('T')[0],
}

export const useSchemaStore = create(
  persist(
    (set, get) => ({
      annotationFields: DEFAULT_ANNOTATION_FIELDS,
      imageFields:      DEFAULT_IMAGE_FIELDS,
      metadata:         DEFAULT_METADATA,
      exportStructure:  'nested', // 'nested' | 'flat'

      setMetadata: (patch) => set((s) => ({ metadata: { ...s.metadata, ...patch } })),

      setExportStructure: (v) => set({ exportStructure: v }),

      toggleAnnotationField: (key) => set((s) => ({
        annotationFields: s.annotationFields.map(f =>
          f.key === key && !f.locked ? { ...f, enabled: !f.enabled } : f
        )
      })),

      toggleImageField: (key) => set((s) => ({
        imageFields: s.imageFields.map(f =>
          f.key === key && !f.locked ? { ...f, enabled: !f.enabled } : f
        )
      })),

      addAnnotationField: (field) => set((s) => ({
        annotationFields: [...s.annotationFields, { ...field, locked: false, enabled: true }]
      })),

      removeAnnotationField: (key) => set((s) => ({
        annotationFields: s.annotationFields.filter(f => f.locked || f.key !== key)
      })),

      updateAnnotationField: (key, patch) => set((s) => ({
        annotationFields: s.annotationFields.map(f => f.key === key ? { ...f, ...patch } : f)
      })),

      resetSchema: () => set({
        annotationFields: DEFAULT_ANNOTATION_FIELDS,
        imageFields:      DEFAULT_IMAGE_FIELDS,
        metadata:         DEFAULT_METADATA,
        exportStructure:  'nested',
      }),

      getEnabledAnnotationFields: () => get().annotationFields.filter(f => f.enabled),
    }),
    { name: 'annotator:schema' }
  )
)
