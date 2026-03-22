import { ChevronRight, ChevronDown, FileImage, FileText, FolderOpen, Folder, CheckCircle } from 'lucide-react'
import { useSessionStore } from '../../store/useSessionStore'
import { useAnnotationStore } from '../../store/useAnnotationStore'

function FileNode({ node, depth = 0, flatQueue, currentIdx, onSelect }) {
  const expandedDirs = useSessionStore(s => s.expandedDirs)
  const toggleDir    = useSessionStore(s => s.toggleDir)
  const countFor     = useAnnotationStore(s => s.countFor)

  if (node.type === 'folder') {
    const open = expandedDirs[node.path]
    return (
      <div>
        <div onClick={() => toggleDir(node.path)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: `5px 10px 5px ${10 + depth * 14}px`,
          cursor: 'pointer', userSelect: 'none',
          color: 'var(--text-secondary)', fontSize: 12,
          borderRadius: 5, transition: 'background 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {open ? <FolderOpen size={13} color="var(--warning)" /> : <Folder size={13} color="var(--warning)" />}
          <span style={{ flex: 1 }}>{node.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{node.children?.length ?? 0}</span>
        </div>
        {open && node.children?.map(child => (
          <FileNode key={child.path} node={child} depth={depth + 1} flatQueue={flatQueue} currentIdx={currentIdx} onSelect={onSelect} />
        ))}
      </div>
    )
  }

  const queueIdx = flatQueue.findIndex(f => f.path === node.path)
  const isCurrent = queueIdx === currentIdx
  const count = countFor(node.name, 0)

  return (
    <div onClick={() => onSelect(queueIdx)} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: `5px 10px 5px ${10 + depth * 14}px`,
      cursor: 'pointer', userSelect: 'none', fontSize: 12, borderRadius: 5,
      background: isCurrent ? 'var(--navy-800)' : 'transparent',
      color: isCurrent ? 'var(--accent-light)' : 'var(--text-secondary)',
      border: isCurrent ? '1px solid var(--accent)' : '1px solid transparent',
      transition: 'all 0.1s', marginLeft: 4, marginRight: 4,
    }}>
      {node.sourceType === 'pdf' ? <FileText size={12} /> : <FileImage size={12} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
      {count > 0 && (
        <span style={{
          fontSize: 10, background: 'var(--accent)', color: '#fff',
          borderRadius: 8, padding: '0px 5px', fontWeight: 600,
        }}>{count}</span>
      )}
    </div>
  )
}

export default function FileTree() {
  const { fileTree, flatQueue, currentIdx, folderName, setCurrentIdx } = useSessionStore()

  if (!fileTree.length) return (
    <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
      No folder loaded
    </div>
  )

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--surface-border)', marginBottom: 4 }}>
        {folderName}
      </div>
      {fileTree.map(node => (
        <FileNode key={node.path} node={node} flatQueue={flatQueue} currentIdx={currentIdx} onSelect={setCurrentIdx} />
      ))}
    </div>
  )
}
