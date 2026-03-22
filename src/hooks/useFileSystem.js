import { useSessionStore } from '../store/useSessionStore'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.tiff', '.webp']
const PDF_EXT   = '.pdf'

const ext = (name) => name.slice(name.lastIndexOf('.')).toLowerCase()

async function readDir(dirHandle, path = '') {
  const nodes = []
  for await (const [name, handle] of dirHandle.entries()) {
    const nodePath = path ? `${path}/${name}` : name
    if (handle.kind === 'directory') {
      const children = await readDir(handle, nodePath)
      if (children.length) nodes.push({ type: 'folder', name, path: nodePath, children, handle })
    } else {
      const e = ext(name)
      if (IMAGE_EXTS.includes(e) || e === PDF_EXT)
        nodes.push({ type: 'file', name, path: nodePath, sourceType: e === PDF_EXT ? 'pdf' : 'image', handle })
    }
  }
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function flatten(nodes, folder = '') {
  const result = []
  for (const node of nodes) {
    if (node.type === 'folder') {
      result.push(...flatten(node.children, node.path))
    } else {
      result.push({ fileName: node.name, folder, path: node.path, sourceType: node.sourceType, handle: node.handle, page: 0 })
    }
  }
  return result
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
      if (e.name !== 'AbortError') console.error(e)
      return false
    }
  }

  const supported = 'showDirectoryPicker' in window

  return { openFolder, supported }
}
