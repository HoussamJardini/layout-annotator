export function buildYoloFiles(annotationMap, imageMeta) {
  const files = {}
  for (const [key, anns] of Object.entries(annotationMap)) {
    if (!anns?.length) continue
    const meta = imageMeta[key] ?? {}
    const [fileName] = key.split('::')
    const lines = anns.map(a => {
      const cx = (a.x + a.w / 2) / (meta.width || 1)
      const cy = (a.y + a.h / 2) / (meta.height || 1)
      const w  = a.w / (meta.width || 1)
      const h  = a.h / (meta.height || 1)
      return `${a.classId - 1} ${cx.toFixed(6)} ${cy.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}`
    })
    const txtName = fileName.replace(/\.[^.]+$/, '.txt')
    files[txtName] = lines.join('\n')
  }
  return files
}
