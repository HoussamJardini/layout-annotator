import { bboxArray } from './bboxMath'

export function buildMarkdown(annotationMap, imageMeta, schemaStore, classStore) {
  const { metadata, annotationFields } = schemaStore
  const enabledFields = annotationFields.filter(f => f.enabled).map(f => f.key)

  const total = Object.values(annotationMap).reduce((s, a) => s + (a?.length ?? 0), 0)
  const imageCount = Object.values(annotationMap).filter(a => a?.length).length

  let md = `# Dataset: ${metadata.dataset}\n`
  md += `**Version**: ${metadata.version} | **Author**: ${metadata.author || '—'} | **License**: ${metadata.license}\n`
  md += `**Images**: ${imageCount} | **Annotations**: ${total} | **Created**: ${metadata.created_at}\n`
  if (metadata.description) md += `\n> ${metadata.description}\n`
  md += `\n---\n\n`

  for (const [key, annotations] of Object.entries(annotationMap)) {
    if (!annotations?.length) continue
    const meta = imageMeta[key] ?? {}
    const [fileName, page] = key.split('::')

    md += `## ${meta.folder ? meta.folder + '/' : ''}${fileName}`
    if (meta.sourceType === 'pdf') md += ` — Page ${parseInt(page) + 1}`
    if (meta.width) md += ` (${meta.width}×${meta.height})`
    md += '\n\n'

    const headers = enabledFields.join(' | ')
    const divider = enabledFields.map(() => '---').join(' | ')
    md += `| ${headers} |\n| ${divider} |\n`

    annotations.forEach((a, i) => {
      const cls = classStore.classes.find(c => c.id === a.classId)
      const all = {
        id: i + 1,
        label: cls?.name ?? 'unknown',
        label_id: a.classId,
        bbox: JSON.stringify(bboxArray(a)),
        area: Math.round(a.w * a.h),
        reading_order: a.reading_order ?? '',
        confidence: a.confidence ?? '',
        transcription: a.transcription ?? '',
        notes: a.notes ?? '',
      }
      const row = enabledFields.map(k => String(all[k] ?? '')).join(' | ')
      md += `| ${row} |\n`
    })
    md += '\n'
  }

  return md
}
