// src/hooks/useFileSystem.js
import { useSessionStore } from '../store/useSessionStore'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.tiff', '.webp', '.bmp']
const PDF_EXT    = '.pdf'
const ext = (n) => { const i = n.lastIndexOf('.'); return i >= 0 ? n.slice(i).toLowerCase() : '' }

// ─── In-memory file cache: path → File object ───
const _fileCache = new Map()
let _rootHandle = null

export function getRootHandle() { return _rootHandle }
export function clearFileCache() { _fileCache.clear() }

// ─── Exported: get a File from cache, fallback to root-walk ───
export async function resolveFile(entry) {
  // 1. Try cache first (instant, always works)
  if (_fileCache.has(entry.path)) {
    return _fileCache.get(entry.path)
  }

  // 2. Fallback: walk from root (for files added after initial scan)
  const root = _rootHandle
  if (!root) throw new Error('No root directory handle. Please re-open the folder.')

  const parts = entry.path.split('/')
  const fileName = parts.pop()
  let current = root
  for (const segment of parts) {
    current = await current.getDirectoryHandle(segment)
  }
  const handle = await current.getFileHandle(fileName)
  const file = await handle.getFile()
  _fileCache.set(entry.path, file)
  return file
}

// ─── Tree scan: read files eagerly and cache them ───
async function readDir(dirHandle, path = '') {
  const nodes = []
  let entries
  try {
    entries = []
    for await (const entry of dirHandle.entries()) {
      entries.push(entry)
    }
  } catch (e) {
    console.warn(`Cannot list directory "${path}":`, e.message)
    return nodes
  }

  for (const [name, handle] of entries) {
    if (name.startsWith('.')) continue
    const nodePath = path ? `${path}/${name}` : name

    if (handle.kind === 'directory') {
      let children = []
      try {
        children = await readDir(handle, nodePath)
      } catch (e) {
        console.warn(`Skipping directory "${nodePath}":`, e.message)
      }
      nodes.push({ type: 'folder', name, path: nodePath, children })
    } else {
      const e = ext(name)
      if (IMAGE_EXTS.includes(e) || e === PDF_EXT) {
        // Read the file NOW while the handle is still fresh
        try {
          const file = await handle.getFile()
          _fileCache.set(nodePath, file)
          nodes.push({
            type: 'file',
            name,
            path: nodePath,
            sourceType: e === PDF_EXT ? 'pdf' : 'image',
          })
        } catch (fileErr) {
          console.warn(`Cannot read file "${nodePath}":`, fileErr.message)
        }
      }
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })
}

function flatten(nodes, folder = '') {
  const result = []
  for (const node of nodes) {
    if (node.type === 'folder') {
      result.push(...flatten(node.children, node.path))
    } else {
      result.push({
        fileName:   node.name,
        folder:     folder || node.path.substring(0, node.path.lastIndexOf('/')) || '',
        path:       node.path,
        sourceType: node.sourceType,
        page:       0,
      })
    }
  }
  return result
}

export function useFileSystem() {
  const setFileTree = useSessionStore(s => s.setFileTree)

  const openFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
      _rootHandle = dirHandle
      _fileCache.clear()
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