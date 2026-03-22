import { useState, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const OCR_URL  = `${API_BASE}/ocr`

export function shouldAutoOCR(className) {
  if (!className) return false
  const n = className.toLowerCase()
  if (n.includes('figure') || n.includes('logo') || n.includes('image') || n.includes('chart')) return false
  if (n === 'table') return false
  return true
}

export function useOCR() {
  const [serverOnline, setServerOnline] = useState(null)
  const checkedRef = useRef(false)

  const checkServer = useCallback(async () => {
    if (checkedRef.current) return serverOnline
    checkedRef.current = true
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) })
      const online = res.ok
      setServerOnline(online)
      return online
    } catch {
      setServerOnline(false)
      return false
    }
  }, [serverOnline])

  const runOCR = useCallback(async (imageUrl, ann, imgWidth, imgHeight) => {
    const online = await checkServer()
    if (!online) return null
    const img = new Image()
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imageUrl })
    const sx = Math.max(0, Math.round(ann.x))
    const sy = Math.max(0, Math.round(ann.y))
    const sw = Math.min(Math.round(ann.w), (imgWidth  || img.naturalWidth)  - sx)
    const sh = Math.min(Math.round(ann.h), (imgHeight || img.naturalHeight) - sy)
    const canvas = document.createElement('canvas')
    canvas.width = sw; canvas.height = sh
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    const base64 = canvas.toDataURL('image/png')
    try {
      const res = await fetch(OCR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, hint: ann.label ?? '' }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }, [checkServer])

  return { runOCR, checkServer, serverOnline }
}