import { Layers, PenTool, Database, FileJson, Table2, Sparkles, Globe, Github } from 'lucide-react'

const FEATURES = [
  { icon: PenTool,   label: 'Annotation Canvas',   desc: 'Draw bounding boxes on documents with right-click pan, scroll zoom, and per-class color coding.' },
  { icon: Table2,    label: 'Table Builder',        desc: 'Auto-detect table structure with Microsoft TATR, merge/split cells, and fill content with OCR autocomplete.' },
  { icon: Sparkles,  label: 'OCR Integration',      desc: 'Tesseract 5 OCR with TATR table detection. Suggests text per annotation with confidence scoring.' },
  { icon: FileJson,  label: 'Flexible Export',      desc: 'Export as JSON, Markdown, COCO, YOLO, or ZIP. Edit JSON in-browser before download.' },
  { icon: Database,  label: 'LocalStorage Persist', desc: 'All annotations, classes, and schema config auto-saved — no backend required.' },
  { icon: Layers,    label: 'Schema Editor',        desc: 'Fully configurable export schema — choose which fields appear per annotation and define dataset metadata.' },
]

const CLASSES = [
  { name: 'text_block',  color: '#3498db' }, { name: 'title',      color: '#9b59b6' },
  { name: 'table',       color: '#e67e22' }, { name: 'table_cell', color: '#f39c12' },
  { name: 'header',      color: '#1abc9c' }, { name: 'footer',     color: '#16a085' },
  { name: 'figure',      color: '#e74c3c' }, { name: 'signature',  color: '#c0392b' },
  { name: 'date',        color: '#27ae60' }, { name: 'amount',     color: '#2ecc71' },
  { name: 'logo',        color: '#34495e' },
]

export default function About() {
  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'40px 32px 60px' }}>

        {/* Hero */}
        <div style={{ marginBottom:48 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <PenTool size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.5px', lineHeight:1 }}>
                Layout<span style={{ color:'var(--accent)' }}>Annotator</span>
                <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace', marginLeft:10, verticalAlign:'middle' }}>v2.1</span>
              </h1>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>Document Layout Detection Dataset Annotation Tool</p>
            </div>
          </div>
          <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.8, maxWidth:680 }}>
            A browser-based annotation workspace built for the <b style={{ color:'var(--text-primary)' }}>Document Layout Detection</b> project.
            The goal is to build a multi-model pipeline that takes scanned PDF or image documents and produces structured <b style={{ color:'var(--text-primary)' }}>JSON</b> and <b style={{ color:'var(--text-primary)' }}>Markdown</b> — identifying headers, footers, paragraphs, tables, figures, and more — without relying on Vision-Language Models.
          </p>
          <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.8, maxWidth:680, marginTop:12 }}>
            This tool handles the full annotation-to-dataset workflow: draw boxes, label elements, transcribe text, build tables, configure the export schema, and export professional-grade datasets in multiple formats.
          </p>
        </div>

        {/* Author card */}
        <div style={{ background:'var(--surface-raised)', border:'1px solid var(--accent)44', borderRadius:10, padding:'20px 24px', marginBottom:48 }}>
          <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:16 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--navy-800)', border:'2px solid var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20, fontWeight:700, color:'var(--accent)' }}>
              HJ
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>Houssam Jardini</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>Document Layout Detection Project</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <a href="https://houssamjardini.netlify.app/" target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:7, background:'var(--accent)22', border:'1px solid var(--accent)66', color:'var(--accent)', fontSize:12, fontWeight:600, textDecoration:'none', fontFamily:'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)33'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)22'}
            >
              <Globe size={13}/> Portfolio
            </a>
            <a href="https://github.com/HoussamJardini" target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:7, background:'var(--surface)', border:'1px solid var(--surface-border)', color:'var(--text-secondary)', fontSize:12, fontWeight:600, textDecoration:'none', fontFamily:'inherit' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-raised)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <Github size={13}/> GitHub
            </a>
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom:48 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
            <Layers size={16} color="var(--accent)" /> Features
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ background:'var(--surface-raised)', border:'1px solid var(--surface-border)', borderRadius:8, padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <Icon size={14} color="var(--accent)" />
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{label}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6, margin:0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Label classes */}
        <div style={{ marginBottom:48 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>Default Label Classes</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {CLASSES.map(({ name, color }) => (
              <div key={name} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:color+'18', border:`1px solid ${color}55` }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:color }} />
                <span style={{ fontSize:12, color, fontFamily:'JetBrains Mono,monospace', fontWeight:500 }}>{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stack */}
        <div style={{ marginBottom:48 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>Tech Stack</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[
              ['Frontend','React 18 + Vite'],['Styling','Tailwind CSS + CSS variables'],
              ['State','Zustand + localStorage'],['PDF Rendering','PDF.js'],
              ['File Access','File System Access API'],['ZIP Export','JSZip'],
              ['OCR Engine','Tesseract 5 (Python)'],['Table Detect','Microsoft TATR'],
              ['OCR Server','FastAPI + Uvicorn'],
            ].map(([k, v]) => (
              <div key={k} style={{ background:'var(--surface-raised)', border:'1px solid var(--surface-border)', borderRadius:7, padding:'10px 14px' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace', marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Export formats */}
        <div>
          <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>Export Formats</h2>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['JSON (custom schema)', 'Markdown', 'COCO', 'YOLO .txt', 'ZIP bundle', 'Per-image JSON'].map(f => (
              <span key={f} style={{ padding:'5px 14px', borderRadius:20, background:'var(--surface-raised)', border:'1px solid var(--surface-border)', fontSize:12, color:'var(--text-secondary)' }}>{f}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}