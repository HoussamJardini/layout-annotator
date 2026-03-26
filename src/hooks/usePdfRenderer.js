import { useState } from 'react'

let pdfjsLib = null

const loadPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib
  const mod = await import('pdfjs-dist')
  // Use the CDN worker — avoids any local path issues
  mod.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.version}/pdf.worker.min.mjs`
  pdfjsLib = mod
  return mod
}

export function usePdfRenderer() {
  const [rendering, setRendering] = useState(false)

  const renderPage = async (fileHandle, pageNum = 1, scale = 2) => {
    setRendering(true)
    try {
      const lib    = await loadPdfJs()
      const file   = await fileHandle.getFile()
      const buffer = await file.arrayBuffer()
      const pdf    = await lib.getDocument({ data: buffer }).promise
      const page   = await pdf.getPage(pageNum)
      const vp     = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width  = vp.width
      canvas.height = vp.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
      return { dataUrl: canvas.toDataURL('image/png'), width: vp.width, height: vp.height, numPages: pdf.numPages }
    } finally {
      setRendering(false)
    }
  }

  return { renderPage, rendering }
}