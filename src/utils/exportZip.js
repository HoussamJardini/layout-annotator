import JSZip from 'jszip'
import { buildDataset } from './exportJson'
import { buildMarkdown } from './exportMarkdown'
import { buildCoco } from './exportCoco'
import { buildYoloFiles } from './exportYolo'

export async function exportZip(annotationMap, imageMeta, schemaStore, classStore, options = {}) {
  const zip = new JSZip()
  const ds  = buildDataset(annotationMap, imageMeta, schemaStore, classStore)

  zip.file('dataset.json', JSON.stringify(ds, null, 2))
  zip.file('ground_truth.md', buildMarkdown(annotationMap, imageMeta, schemaStore, classStore))

  if (options.coco) {
    zip.file('coco_format.json', JSON.stringify(buildCoco(annotationMap, imageMeta, classStore), null, 2))
  }

  if (options.yolo) {
    const yolo = buildYoloFiles(annotationMap, imageMeta)
    const folder = zip.folder('yolo')
    for (const [name, content] of Object.entries(yolo)) folder.file(name, content)
  }

  const annFolder = zip.folder('annotations')
  for (const img of ds.images) {
    const name = img.file_name.replace(/\.[^.]+$/, '') + (img.page ? `_page${img.page}` : '') + '.json'
    annFolder.file(name, JSON.stringify(img, null, 2))
  }

  zip.file('classes.json', JSON.stringify(classStore.classes, null, 2))
  zip.file('schema.json', JSON.stringify(schemaStore, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${schemaStore.metadata.dataset}.zip`; a.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
