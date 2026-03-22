import { useState } from 'react'
import { Download, FileJson, FileText, Archive, Edit3 } from 'lucide-react'
import { useAnnotationStore } from '../store/useAnnotationStore'
import { useClassStore } from '../store/useClassStore'
import { useSchemaStore } from '../store/useSchemaStore'
import { buildDataset } from '../utils/exportJson'
import { buildMarkdown } from '../utils/exportMarkdown'
import { buildCoco } from '../utils/exportCoco'
import { exportZip, downloadJson, downloadText } from '../utils/exportZip'
import Button from '../components/ui/Button'
import Toggle from '../components/ui/Toggle'
import Badge from '../components/ui/Badge'
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}


function MarkdownPreview({ source }) {
  const escaped = escapeHtml(source)
  const html = source
    .replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:700;color:var(--text-primary);margin:20px 0 8px;border-bottom:2px solid var(--accent);padding-bottom:6px">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:15px;font-weight:700;color:var(--accent-light);margin:18px 0 6px">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:13px;font-weight:600;color:var(--text-secondary);margin:14px 0 4px">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<b style="color:var(--text-primary)">$1</b>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--surface-border);margin:12px 0"/>')
    .replace(/^\|[-| :]+\|$/gm, '')
    .replace(/^\|(.+)\|$/gm, (_, inner) => {
      const cells = inner.split('|').map(c =>
        `<td style="padding:5px 12px;border:1px solid var(--surface-border);font-size:12px;color:var(--text-primary)">${c.trim()}</td>`
      ).join('')
      return `<tr>${cells}</tr>`
    })
    .replace(/((<tr>.*<\/tr>\n?)+)/g, '<table style="border-collapse:collapse;margin:8px 0;width:100%">$1</table>')
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, '<br/>')

  return (
    <div
      style={{ fontFamily:'inherit', fontSize:13, lineHeight:1.7, color:'var(--text-secondary)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default function ExportReview() {
  const annotationMap = useAnnotationStore(s => s.getAllData())
  const imageMeta     = useAnnotationStore(s => s.imageMeta)
  const classStore    = useClassStore()
  const schemaStore   = useSchemaStore()

  const [view, setView]             = useState('json')
  const [editedJson, setEditedJson] = useState(null)
  const [cocoExport, setCocoExport] = useState(false)
  const [yoloExport, setYoloExport] = useState(false)
  const [jsonError, setJsonError]   = useState(null)

  const dataset  = buildDataset(annotationMap, imageMeta, schemaStore, classStore)
  const markdown = buildMarkdown(annotationMap, imageMeta, schemaStore, classStore)

  const totalImages = Object.values(annotationMap).filter(a => a?.length).length
  const totalAnns   = Object.values(annotationMap).reduce((s, a) => s + (a?.length ?? 0), 0)
  const jsonStr     = editedJson ?? JSON.stringify(dataset, null, 2)

  const validateAndSetJson = (str) => {
    setEditedJson(str)
    try { JSON.parse(str); setJsonError(null) }
    catch (e) { setJsonError(e.message) }
  }

  const getParsedJson = () => {
    try { return editedJson ? JSON.parse(editedJson) : dataset }
    catch { return dataset }
  }

  const TABS = [
    { key: 'json', label: 'JSON Preview', icon: FileJson },
    { key: 'md',   label: 'Markdown',     icon: FileText },
    { key: 'edit', label: 'Edit JSON',    icon: Edit3    },
  ]

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--surface-border)', flexShrink:0, display:'flex', alignItems:'center', gap:16 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>Export & Review</h1>
          <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--text-muted)' }}>
            <span><b style={{ color:'var(--accent)' }}>{totalImages}</b> images</span>
            <span><b style={{ color:'var(--accent)' }}>{totalAnns}</b> annotations</span>
            <span><b style={{ color:'var(--accent)' }}>{classStore.classes.length}</b> classes</span>
          </div>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          <Toggle value={cocoExport} onChange={setCocoExport} label="COCO" />
          <Toggle value={yoloExport} onChange={setYoloExport} label="YOLO" />
        </div>
        <Button variant="ghost" size="sm" icon={FileJson} onClick={() => downloadJson(getParsedJson(), `${schemaStore.metadata.dataset}.json`)}>JSON</Button>
        <Button variant="ghost" size="sm" icon={FileText} onClick={() => downloadText(markdown, 'ground_truth.md')}>Markdown</Button>
        {cocoExport && <Button variant="ghost" size="sm" icon={FileJson} onClick={() => downloadJson(buildCoco(annotationMap, imageMeta, classStore), 'coco_format.json')}>COCO</Button>}
        <Button size="sm" icon={Archive} onClick={() => exportZip(annotationMap, imageMeta, schemaStore, classStore, { coco:cocoExport, yolo:yoloExport })}>Export ZIP</Button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--surface-border)', flexShrink:0, paddingLeft:24 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setView(key)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'10px 18px',
            background:'none', border:'none',
            borderBottom:`2px solid ${view===key ? 'var(--accent)' : 'transparent'}`,
            color: view===key ? 'var(--accent-light)' : 'var(--text-muted)',
            cursor:'pointer', fontSize:13, fontFamily:'inherit',
            fontWeight: view===key ? 600 : 400, transition:'all 0.15s', marginBottom:-1,
          }}>
            <Icon size={13}/>{label}
          </button>
        ))}
        {editedJson && <Badge color="var(--warning)" style={{ alignSelf:'center', marginLeft:8 }}>unsaved edits</Badge>}
        {jsonError  && <Badge color="var(--danger)"  style={{ alignSelf:'center', marginLeft:8 }}>JSON error</Badge>}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'hidden', display:'flex' }}>

        {view === 'json' && (
          <pre style={{ flex:1, overflowY:'auto', padding:24, margin:0, fontFamily:'JetBrains Mono,monospace', fontSize:12, lineHeight:1.75, color:'var(--text-primary)', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
            {jsonStr}
          </pre>
        )}

        {view === 'md' && (
          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

            {/* Left — raw markdown */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', borderRight:'1px solid var(--surface-border)', overflow:'hidden' }}>
              <div style={{ padding:'7px 16px', borderBottom:'1px solid var(--surface-border)', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>Raw Markdown</span>
                <button
                  onClick={() => { const el = document.createElement('textarea'); el.value = markdown; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el) }}
                  style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}
                >
                  Copy
                </button>
              </div>
              <pre style={{ flex:1, overflowY:'auto', padding:20, margin:0, fontFamily:'JetBrains Mono,monospace', fontSize:12, lineHeight:1.9, color:'var(--text-primary)', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                {markdown}
              </pre>
            </div>

            {/* Right — rendered preview */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'7px 16px', borderBottom:'1px solid var(--surface-border)', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>
                Rendered Preview
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:24 }}>
                <MarkdownPreview source={markdown} />
              </div>
            </div>
          </div>
        )}

        {view === 'edit' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {jsonError && (
              <div style={{ padding:'8px 16px', background:'var(--danger)22', borderBottom:'1px solid var(--danger)', fontSize:12, color:'var(--danger)', fontFamily:'JetBrains Mono,monospace' }}>
                ⚠ {jsonError}
              </div>
            )}
            <textarea
              value={jsonStr}
              onChange={e => validateAndSetJson(e.target.value)}
              spellCheck={false}
              style={{ flex:1, resize:'none', background:'var(--navy-950)', border:'none', color:'var(--text-primary)', fontFamily:'JetBrains Mono,monospace', fontSize:12, lineHeight:1.75, padding:24, outline:'none' }}
            />
            <div style={{ padding:'8px 16px', borderTop:'1px solid var(--surface-border)', display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', flex:1 }}>Edit the JSON freely before exporting. Changes only affect the downloaded file.</span>
              <Button variant="ghost" size="sm" onClick={() => { setEditedJson(null); setJsonError(null) }}>Reset</Button>
              <Button size="sm" icon={Download} onClick={() => downloadJson(getParsedJson(), `${schemaStore.metadata.dataset}_edited.json`)} disabled={!!jsonError}>Download Edited</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}