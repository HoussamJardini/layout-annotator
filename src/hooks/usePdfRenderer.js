import { useState, useEffect, useRef } from 'react'

let pdfjsLib = null
const loadPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib
  const mod = await import('pdfjs-dist')
  mod.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString()
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
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport: vp }).promise
      const dataUrl = canvas.toDataURL('image/png')
      return { dataUrl, width: vp.width, height: vp.height, numPages: pdf.numPages }
    } finally {
      setRendering(false)
    }
  }

  return { renderPage, rendering }
}
