import { bboxArray } from './bboxMath'

export function buildCoco(annotationMap, imageMeta, classStore) {
  const images = []
  const annotations = []
  const categories = classStore.classes.map(c => ({ id: c.id, name: c.name, supercategory: 'layout' }))
  let annId = 1

  for (const [key, anns] of Object.entries(annotationMap)) {
    if (!anns?.length) continue
    const meta = imageMeta[key] ?? {}
    const [fileName, page] = key.split('::')
    const imgId = images.length + 1
    images.push({ id: imgId, file_name: fileName, width: meta.width ?? 0, height: meta.height ?? 0 })
    for (const a of anns) {
      const box = bboxArray(a)
      annotations.push({
        id: annId++, image_id: imgId, category_id: a.classId,
        bbox: box, area: box[2] * box[3], iscrowd: 0,
        segmentation: []
      })
    }
  }

  return {
    info: { version: '1.0', contributor: '', date_created: new Date().toISOString() },
    licenses: [], categories, images, annotations
  }
}
