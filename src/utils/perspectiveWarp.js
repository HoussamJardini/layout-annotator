/**
 * Perspective warp — maps a quadrilateral region to a rectangle.
 */

function solve(A, b) {
    const n = b.length
    const M = A.map((row, i) => [...row, b[i]])
    for (let col = 0; col < n; col++) {
      let maxRow = col
      for (let row = col + 1; row < n; row++)
        if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
      ;[M[col], M[maxRow]] = [M[maxRow], M[col]]
      if (Math.abs(M[col][col]) < 1e-12) continue
      for (let row = col + 1; row < n; row++) {
        const f = M[row][col] / M[col][col]
        for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k]
      }
    }
    const x = new Array(n).fill(0)
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n]
      for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j]
      x[i] /= M[i][i]
    }
    return x
  }
  
  function computeHomography(src, dst) {
    const A = [], b = []
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = src[i], [dx, dy] = dst[i]
      A.push([sx, sy, 1, 0,  0,  0, -dx*sx, -dx*sy])
      A.push([0,  0,  0, sx, sy, 1, -dy*sx, -dy*sy])
      b.push(dx); b.push(dy)
    }
    const h = solve(A, b)
    return [[h[0],h[1],h[2]],[h[3],h[4],h[5]],[h[6],h[7],1]]
  }
  
  function applyH(H, x, y) {
    const w = H[2][0]*x + H[2][1]*y + H[2][2]
    return [(H[0][0]*x + H[0][1]*y + H[0][2])/w, (H[1][0]*x + H[1][1]*y + H[1][2])/w]
  }
  
  export function perspectiveWarp(srcCanvas, corners) {
    const [tl, tr, br, bl] = corners
    const w = Math.round((Math.hypot(tr[0]-tl[0],tr[1]-tl[1]) + Math.hypot(br[0]-bl[0],br[1]-bl[1])) / 2)
    const h = Math.round((Math.hypot(bl[0]-tl[0],bl[1]-tl[1]) + Math.hypot(br[0]-tr[0],br[1]-tr[1])) / 2)
    const H = computeHomography([[0,0],[w,0],[w,h],[0,h]], [tl,tr,br,bl])
    const dst = document.createElement('canvas')
    dst.width = w; dst.height = h
    const ctx = dst.getContext('2d')
    const srcCtx = srcCanvas.getContext('2d')
    const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height)
    const dstData = ctx.createImageData(w, h)
    const sw = srcCanvas.width, sh = srcCanvas.height
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const [sx, sy] = applyH(H, dx, dy)
        const x = Math.round(sx), y = Math.round(sy)
        if (x < 0 || x >= sw || y < 0 || y >= sh) continue
        const si = (y*sw+x)*4, di = (dy*w+dx)*4
        dstData.data[di]   = srcData.data[si]
        dstData.data[di+1] = srcData.data[si+1]
        dstData.data[di+2] = srcData.data[si+2]
        dstData.data[di+3] = srcData.data[si+3]
      }
    }
    ctx.putImageData(dstData, 0, 0)
    return dst
  }