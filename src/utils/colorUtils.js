export const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export const generateColor = (index) => {
  const palette = [
    '#3498db','#9b59b6','#e67e22','#1abc9c','#e74c3c',
    '#f39c12','#2980b9','#27ae60','#c0392b','#16a085',
    '#8e44ad','#d35400','#2ecc71','#34495e','#f1c40f',
  ]
  return palette[index % palette.length]
}
