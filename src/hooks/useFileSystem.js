import { useSessionStore } from '../store/useSessionStore'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.tiff', '.webp', '.bmp']
const PDF_EXT    = '.pdf'

const getExt = (name) => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

// The one root handle — stays valid as long as the session is active
let _rootHandle = null

export function getRootHandle() { return _rootHandle }

async function readDir(dirHandle, path = '') {
  const nodes = []
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      if (name.startsWith('.')) continue
      const nodePath = path ? `${path}/${name}` : name
      if (handle.kind === 'directory') {
        try {
          const children = await readDir(handle, nodePath)
          nodes.push({ type: 'folder', name, path: nodePath, children })
        } catch (e) {
          console.warn(`Skipping directory "${nodePath}":`, e.message)
          nodes.push({ type: 'folder', name, path: nodePath, children: [] })
        }
      } else {
        const e = getExt(name)
        if (IMAGE_EXTS.includes(e) || e === PDF_EXT) {
          // Store only the path — resolve from root on demand
          nodes.push({ type: 'file', name, path: nodePath, sourceType: e === PDF_EXT ? 'pdf' : 'image' })
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
    else result.push({ fileName: node.name, folder, path: node.path, sourceType: node.sourceType, page: 0 })
  }
  return result
}

/**
 * Resolve a fresh file handle by re-walking from the root.
 * Root handle never goes stale — this always works.
 */
export async function resolveFileHandle(entry) {
  const root = _rootHandle
  if (!root) throw new Error('No root handle — please re-open the folder.')
  const parts = entry.path.split('/')
  let current = root
  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i])
  }
  return await current.getFileHandle(parts[parts.length - 1])
}

export function useFileSystem() {
  const setFileTree = useSessionStore(s => s.setFileTree)

  const openFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
      _rootHandle = dirHandle
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