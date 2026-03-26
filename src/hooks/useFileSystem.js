import { useSessionStore } from '../store/useSessionStore'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.tiff', '.webp', '.bmp']
const PDF_EXT    = '.pdf'

const getExt = (name) => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

async function readDir(dirHandle, path = '') {
  const nodes = []
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      if (name.startsWith('.')) continue
      const nodePath = path ? `${path}/${name}` : name
      if (handle.kind === 'directory') {
        try {
          const children = await readDir(handle, nodePath)
          nodes.push({ type: 'folder', name, path: nodePath, children, dirHandle: handle })
        } catch (e) {
          console.warn(`Skipping directory "${nodePath}":`, e.message)
          nodes.push({ type: 'folder', name, path: nodePath, children: [], dirHandle: handle })
        }
      } else {
        const e = getExt(name)
        if (IMAGE_EXTS.includes(e) || e === PDF_EXT) {
          // Store parent dirHandle, not the file handle — file handles go stale
          nodes.push({ type: 'file', name, path: nodePath, sourceType: e === PDF_EXT ? 'pdf' : 'image', dirHandle })
        }
      }
    }
  } catch (e) {
    console.warn(`Error reading "${path}":`, e.message)
  }
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })
}

function flatten(nodes, folder = '') {
  const result = []
  for (const node of nodes) {
    if (node.type === 'folder') result.push(...flatten(node.children, node.path))
    else result.push({ fileName: node.name, folder, path: node.path, sourceType: node.sourceType, dirHandle: node.dirHandle, handle: null, page: 0 })
  }
  return result
}

export async function resolveFileHandle(entry) {
  if (!entry.dirHandle) throw new Error('No directory handle stored for this file.')
  return await entry.dirHandle.getFileHandle(entry.fileName)
}

export function useFileSystem() {
  const setFileTree = useSessionStore(s => s.setFileTree)
  const openFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
      const tree = await readDir(dirHandle)
      const flat = flatten(tree)
      setFileTree(dirHandle.name, tree, flat)
      return true
    } catch (e) {
      if (e.name !== 'AbortError') console.error('openFolder error:', e)
      return false
    }
  }
  const supported = 'showDirectoryPicker' in window
  return { openFolder, supported }
}