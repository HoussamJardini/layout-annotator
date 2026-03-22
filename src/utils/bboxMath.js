export const rectFromPoints = (x1, y1, x2, y2) => ({
  x: Math.min(x1, x2),
  y: Math.min(y1, y2),
  w: Math.abs(x2 - x1),
  h: Math.abs(y2 - y1),
})

export const area = ({ w, h }) => w * h

export const clampBox = (box, imgW, imgH) => {
  const x = Math.max(0, Math.min(box.x, imgW - 1))
  const y = Math.max(0, Math.min(box.y, imgH - 1))
  return {
    x, y,
    w: Math.min(box.w, imgW - x),
    h: Math.min(box.h, imgH - y),
  }
}

export const normalizeBox = (box, imgW, imgH) => ({
  x: box.x / imgW,
  y: box.y / imgH,
  w: box.w / imgW,
  h: box.h / imgH,
})

export const bboxArray = ({ x, y, w, h }) => [
  Math.round(x), Math.round(y), Math.round(w), Math.round(h)
]

export const pointInBox = (px, py, box) =>
  px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h

export const handleHitTest = (px, py, box, tol = 8) => {
  const { x, y, w, h } = box
  if (Math.abs(px - (x + w)) < tol && Math.abs(py - (y + h)) < tol) return 'se'
  if (Math.abs(px - x)       < tol && Math.abs(py - (y + h)) < tol) return 'sw'
  if (Math.abs(px - (x + w)) < tol && Math.abs(py - y)       < tol) return 'ne'
  if (Math.abs(px - x)       < tol && Math.abs(py - y)       < tol) return 'nw'
  return null
}

export const generateId = () => Date.now() + Math.random()
