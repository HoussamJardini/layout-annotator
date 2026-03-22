import { useState } from 'react'
import { Plus, Trash2, RotateCcw, Eye, Lock } from 'lucide-react'
import { useSchemaStore } from '../store/useSchemaStore'
import Button from '../components/ui/Button'
import Toggle from '../components/ui/Toggle'
import Badge from '../components/ui/Badge'

const TYPES = ['string','number','array','boolean']

function FieldRow({ field, onToggle, onRemove, onUpdate }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 14px', borderRadius: 7,
      background: field.enabled ? 'var(--surface-raised)' : 'var(--surface)',
      border: '1px solid var(--surface-border)',
      opacity: field.enabled ? 1 : 0.5,
      transition: 'all 0.15s',
    }}>
      <Toggle value={field.enabled} onChange={() => !field.locked && onToggle(field.key)} />
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-light)', width: 130, flexShrink: 0 }}>
        {field.key}
      </span>
      <select value={field.type} onChange={e => onUpdate(field.key, { type: e.target.value })} disabled={field.locked}
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 5, padding: '3px 8px', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
        {TYPES.map(t => <option key={t}>{t}</option>)}
      </select>
      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>{field.description}</span>
      {field.locked ? <Lock size={12} color="var(--text-muted)" /> : (
        <button onClick={() => onRemove(field.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 3, borderRadius: 3 }}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

export default function SchemaEditor() {
  const store = useSchemaStore()
  const [newField, setNewField] = useState({ key: '', type: 'string', description: '' })
  const [showPreview, setShowPreview] = useState(true)

  const sampleAnnotation = {}
  store.annotationFields.filter(f => f.enabled).forEach(f => {
    const samples = { id: 1, label: 'table', label_id: 3, bbox: [120,80,300,40], area: 12000, reading_order: 1, confidence: 0.98, transcription: 'Sample text', notes: '' }
    sampleAnnotation[f.key] = samples[f.key] ?? (f.type === 'number' ? 0 : f.type === 'array' ? [] : '')
  })

  const sampleOutput = {
    ...store.metadata,
    categories: [{ id: 3, name: 'table', color: '#e67e22' }],
    images: [{
      id: 1, file_name: 'invoice_001.pdf', folder: 'batch_01/', source_type: 'pdf', page: 1,
      width: 1200, height: 1600,
      annotations: [sampleAnnotation],
    }]
  }

  const addField = () => {
    if (!newField.key.trim()) return
    store.addAnnotationField(newField)
    setNewField({ key: '', type: 'string', description: '' })
  }

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Left - config */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--surface-border)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--surface-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Export Schema</h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose which fields appear in every exported annotation and image entry.</p>
            </div>
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={store.resetSchema}>Reset</Button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Dataset metadata */}
          <section>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dataset Metadata</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(store.metadata).map(([key, val]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>{key}</label>
                  <input value={val} onChange={e => store.setMetadata({ [key]: e.target.value })}
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit' }} />
                </div>
              ))}
            </div>
          </section>

          {/* Export structure */}
          <section>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Export Structure</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {['nested','flat'].map(v => (
                <button key={v} onClick={() => store.setExportStructure(v)} style={{
                  padding: '6px 16px', borderRadius: 6, border: '1px solid',
                  borderColor: store.exportStructure === v ? 'var(--accent)' : 'var(--surface-border)',
                  background: store.exportStructure === v ? 'var(--navy-800)' : 'var(--surface-raised)',
                  color: store.exportStructure === v ? 'var(--accent-light)' : 'var(--text-secondary)',
                  fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
                }}>{v}</button>
              ))}
            </div>
          </section>

          {/* Annotation fields */}
          <section>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Annotation Fields <Badge color="var(--accent)" style={{ marginLeft: 8 }}>{store.annotationFields.filter(f=>f.enabled).length} active</Badge>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {store.annotationFields.map(f => (
                <FieldRow key={f.key} field={f}
                  onToggle={store.toggleAnnotationField}
                  onRemove={store.removeAnnotationField}
                  onUpdate={store.updateAnnotationField} />
              ))}
            </div>
            {/* Add field */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Field key</label>
                <input value={newField.key} onChange={e => setNewField(f => ({ ...f, key: e.target.value }))}
                  placeholder="custom_field" onKeyDown={e => e.key === 'Enter' && addField()}
                  style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
                <select value={newField.type} onChange={e => setNewField(f => ({ ...f, type: e.target.value }))}
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13 }}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description</label>
                <input value={newField.description} onChange={e => setNewField(f => ({ ...f, description: e.target.value }))}
                  placeholder="optional"
                  style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit' }} />
              </div>
              <Button size="sm" icon={Plus} onClick={addField}>Add</Button>
            </div>
          </section>
        </div>
      </div>

      {/* Right - live preview */}
      <div style={{ width: 420, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--surface-border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Live JSON Preview</span>
          <Badge color="var(--success)">live</Badge>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <pre style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, lineHeight: 1.7,
            color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {JSON.stringify(sampleOutput, null, 2)
              .replace(/"([^"]+)":/g, (_, k) => `"<span style="color:#4da6cc">${k}</span>":`)
            }
          </pre>
          <pre style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, lineHeight: 1.7,
            color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {JSON.stringify(sampleOutput, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
