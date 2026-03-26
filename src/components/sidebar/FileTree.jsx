import { ChevronRight, ChevronDown, FileImage, FileText, FolderOpen, Folder } from 'lucide-react'
import { useSessionStore } from '../../store/useSessionStore'
import { useAnnotationStore } from '../../store/useAnnotationStore'

function countFiles(node) {
  if (node.type === 'file') return 1
  return (node.children ?? []).reduce((s, c) => s + countFiles(c), 0)
}

function FileNode({ node, depth, flatQueue, currentIdx, onSelect }) {
  const expandedDirs  = useSessionStore(s => s.expandedDirs)
  const toggleDir     = useSessionStore(s => s.toggleDir)
  const annotationMap = useAnnotationStore(s => s.annotationMap)

  if (node.type === 'folder') {
    const open       = !!expandedDirs[node.path]
    const totalFiles = countFiles(node)
    const folderAnnCount = (() => {
      let total = 0
      const walk = (children) => {
        for (const child of children) {
          if (child.type === 'folder') walk(child.children ?? [])
          else for (const key of Object.keys(annotationMap))
            if (key.startsWith(child.name + '::')) total += annotationMap[key]?.length ?? 0
        }
      }
      walk(node.children ?? [])
      return total
    })()

    return (
      <div>
        <div onClick={() => toggleDir(node.path)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: `5px 8px 5px ${8 + depth * 14}px`,
          cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)',
          fontSize: 12, borderRadius: 5, transition: 'background 0.1s',
          marginLeft: 2, marginRight: 2,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {open ? <ChevronDown size={12} style={{ flexShrink:0 }}/> : <ChevronRight size={12} style={{ flexShrink:0 }}/>}
          {open ? <FolderOpen size={13} color="var(--warning)" style={{ flexShrink:0 }}/> : <Folder size={13} color="var(--warning)" style={{ flexShrink:0 }}/>}
          <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.name}</span>
          <span style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>{totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>
          {folderAnnCount > 0 && (
            <span style={{ fontSize:10, background:'var(--accent)44', color:'var(--accent)', borderRadius:8, padding:'0 5px', fontWeight:600, flexShrink:0 }}>{folderAnnCount}</span>
          )}
        </div>
        {open && (
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute', left: 8 + depth * 14 + 6, top:0, bottom:4, width:1, background:'var(--surface-border)', opacity:0.4 }} />
            {node.children?.map(child => (
              <FileNode key={child.path} node={child} depth={depth+1} flatQueue={flatQueue} currentIdx={currentIdx} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const queueIdx  = flatQueue.findIndex(f => f.path === node.path)
  const isCurrent = queueIdx === currentIdx
  const annCount  = (() => {
    let total = 0
    for (const key of Object.keys(annotationMap))
      if (key.startsWith(node.name + '::')) total += annotationMap[key]?.length ?? 0
    return total
  })()

  return (
    <div onClick={() => queueIdx >= 0 && onSelect(queueIdx)} style={{
      display:'flex', alignItems:'center', gap:6,
      padding: `4px 8px 4px ${8 + depth * 14}px`,
      cursor:'pointer', userSelect:'none', fontSize:12, borderRadius:5,
      background: isCurrent ? 'var(--navy-800)' : 'transparent',
      color: isCurrent ? 'var(--accent-light)' : 'var(--text-secondary)',
      border: `1px solid ${isCurrent ? 'var(--accent)' : 'transparent'}`,
      transition:'all 0.1s', marginLeft:2, marginRight:2,
    }}
    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--surface-raised)' }}
    onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
    >
      {node.sourceType === 'pdf' ? <FileText size={12} style={{ flexShrink:0 }}/> : <FileImage size={12} style={{ flexShrink:0 }}/>}
      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{node.name}</span>
      {annCount > 0 && (
        <span style={{ fontSize:10, background:'var(--accent)', color:'#fff', borderRadius:8, padding:'0 5px', fontWeight:600, flexShrink:0 }}>{annCount}</span>
      )}
    </div>
  )
}

export default function FileTree() {
  const { fileTree, flatQueue, currentIdx, folderName, setCurrentIdx, expandedDirs, toggleDir } = useSessionStore()

  if (!fileTree.length) return (
    <div style={{ padding:16, color:'var(--text-muted)', fontSize:12, textAlign:'center', lineHeight:1.6 }}>
      No folder loaded.<br/>
      <span style={{ fontSize:11 }}>Open a folder above to begin.</span>
    </div>
  )

  const totalFiles = fileTree.reduce((s, n) => s + countFiles(n), 0)
  const allPaths   = []
  const collectPaths = (nodes) => {
    for (const n of nodes) {
      if (n.type === 'folder') { allPaths.push(n.path); collectPaths(n.children ?? []) }
    }
  }
  collectPaths(fileTree)
  const allExpanded = allPaths.every(p => expandedDirs[p])
  const toggleAll   = () => allPaths.forEach(p => { if (allExpanded ? expandedDirs[p] : !expandedDirs[p]) toggleDir(p) })

  return (
    <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', flex:1 }}>

      <div style={{ padding:'7px 10px', fontSize:11, color:'var(--text-muted)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', borderBottom:'1px solid var(--surface-border)', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={folderName}>{folderName}</span>
        <span style={{ fontSize:10, fontWeight:400 }}>{totalFiles}</span>
        {allPaths.length > 0 && (
          <button onClick={toggleAll} title={allExpanded ? 'Collapse all' : 'Expand all'}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--text-muted)', padding:'0 2px', fontFamily:'inherit', lineHeight:1 }}>
            {allExpanded ? '−' : '+'}
          </button>
        )}
      </div>

      <div style={{ overflowY:'auto', flex:1, padding:'4px 0' }}>
        {fileTree.map(node => (
          <FileNode key={node.path} node={node} depth={0} flatQueue={flatQueue} currentIdx={currentIdx} onSelect={setCurrentIdx} />
        ))}
      </div>

      <div style={{ padding:'6px 10px', borderTop:'1px solid var(--surface-border)', fontSize:10, color:'var(--text-muted)', display:'flex', justifyContent:'space-between', flexShrink:0 }}>
        <span>{currentIdx + 1} / {flatQueue.length}</span>
        <span>{flatQueue.filter(f => f.sourceType === 'pdf').length} PDF · {flatQueue.filter(f => f.sourceType === 'image').length} img</span>
      </div>
    </div>
  )
}