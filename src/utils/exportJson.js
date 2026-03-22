import { bboxArray } from './bboxMath'

export function buildDataset(annotationMap, imageMeta, schemaStore, classStore) {
  const { metadata, annotationFields, imageFields } = schemaStore
  const enabledAnn = annotationFields.filter(f => f.enabled).map(f => f.key)
  const enabledImg = imageFields.filter(f => f.enabled).map(f => f.key)
  const categories = classStore.classes.map(c => ({ id: c.id, name: c.name, color: c.color }))

  const images = []
  let annGlobalId = 1

  for (const [key, annotations] of Object.entries(annotationMap)) {
    if (!annotations?.length) continue
    const meta = imageMeta[key] ?? {}
    const [fileName, page] = key.split('::')

    const imgObj = {}
    const allImgFields = {
      id: images.length + 1, file_name: fileName,
      folder: meta.folder ?? '', source_type: meta.sourceType ?? 'image',
      page: parseInt(page ?? 0), width: meta.width ?? 0, height: meta.height ?? 0,
    }
    for (const k of enabledImg) if (k in allImgFields) imgObj[k] = allImgFields[k]

    imgObj.annotations = annotations.map(a => {
      const cls     = classStore.classes.find(c => c.id === a.classId)
      const box     = bboxArray(a)
      const n       = cls?.name?.toLowerCase() ?? ''
      const isImage = n.includes('figure') || n.includes('image') || n.includes('logo') || n.includes('chart')
      const isTable = n.includes('table')

      const all = {
        id: annGlobalId++, label: cls?.name ?? 'unknown', label_id: a.classId,
        bbox: box, area: Math.round(a.w * a.h),
        reading_order: a.reading_order ?? null, confidence: a.confidence ?? null,
        notes: a.notes ?? '', transcription: a.transcription ?? '',
      }
      const out = {}
      for (const k of enabledAnn) if (k in all) out[k] = all[k]

      // Always include content regardless of schema toggle
      if (isImage)              out.content_type = 'image_crop'
      if (isTable && a.tableData) out.table = a.tableData
      if (!isImage && !isTable)   out.text  = a.text ?? ''

      return out
    })

    images.push(imgObj)
  }

  return { ...metadata, categories, images }
}