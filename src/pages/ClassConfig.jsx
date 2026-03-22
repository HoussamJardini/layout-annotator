import { useState } from 'react'
import { Plus, Trash2, Download, Upload, RotateCcw, Edit2, Check, X } from 'lucide-react'
import { useClassStore } from '../store/useClassStore'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import ColorPicker from '../components/ui/ColorPicker'

const KEYS = ['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t']

function ClassRow({ cls, onEdit, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', borderRadius: 8,
      background: 'var(--surface-raised)',
      border: '1px solid var(--surface-border)',
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = cls.color + '66'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--surface-border)'}
    >
      <div style={{ width: 14, height: 14, borderRadius: 3, background: cls.color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', flex: 1, fontWeight: 500 }}>
        {cls.name}
      </span>
      {cls.shortcut && (
        <Badge color="var(--accent)">{cls.shortcut}</Badge>
      )}
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, marginLeft: 8 }}>{cls.description}</span>
      <Badge color={cls.color}>id:{cls.id}</Badge>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => onEdit(cls)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex' }}>
          <Edit2 size={13} />
        </button>
        <button onClick={() => onDelete(cls.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4, borderRadius: 4, display: 'flex' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

export default function ClassConfig() {
  const { classes, addClass, updateClass, deleteClass, resetClasses, importClasses } = useClassStore()
  const [editing, setEditing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#3498db', shortcut: '', description: '' })

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', color: '#3498db', shortcut: '', description: '' })
    setShowModal(true)
  }

  const openEdit = (cls) => {
    setEditing(cls)
    setForm({ name: cls.name, color: cls.color, shortcut: cls.shortcut ?? '', description: cls.description ?? '' })
    setShowModal(true)
  }

  const save = () => {
    if (!form.name.trim()) return
    const payload = { ...form, shortcut: form.shortcut || null }
    if (editing) updateClass(editing.id, payload)
    else addClass(payload)
    setShowModal(false)
  }

  const exportClasses = () => {
    const blob = new Blob([JSON.stringify(classes, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'classes.json'; a.click()
  }

  const importFromFile = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'
    input.onchange = async (e) => {
      const text = await e.target.files[0].text()
      try { importClasses(JSON.parse(text)) } catch {}
    }
    input.click()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--surface-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Label Classes</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Define the element types you want to annotate. Assign keyboard shortcuts for fast labeling.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" icon={Upload} onClick={importFromFile}>Import</Button>
            <Button variant="ghost" size="sm" icon={Download} onClick={exportClasses}>Export</Button>
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetClasses}>Reset</Button>
            <Button size="sm" icon={Plus} onClick={openAdd}>Add Class</Button>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <span><b style={{ color: 'var(--accent)' }}>{classes.length}</b> classes defined</span>
          <span><b style={{ color: 'var(--accent)' }}>{classes.filter(c => c.shortcut).length}</b> with keyboard shortcuts</span>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {classes.map(cls => (
          <ClassRow key={cls.id} cls={cls} onEdit={openEdit} onDelete={deleteClass} />
        ))}
        {!classes.length && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60, fontSize: 14 }}>
            No classes yet. Click "Add Class" to get started.
          </div>
        )}
      </div>

      {/* Shortcut reference */}
      <div style={{ padding: '12px 28px', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Shortcuts:</span>
        {classes.filter(c => c.shortcut).map(c => (
          <span key={c.id} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            <kbd style={{ background: 'var(--surface-raised)', border: '1px solid var(--surface-border)', borderRadius: 3, padding: '1px 5px', fontFamily: 'JetBrains Mono, monospace', color: c.color }}>{c.shortcut}</kbd>
            {' '}{c.name}
          </span>
        ))}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Class' : 'Add Class'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Name *', key: 'name', placeholder: 'e.g. table_cell' },
            { label: 'Description', key: 'description', placeholder: 'Brief description' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 6, padding: '7px 12px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Keyboard Shortcut</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {KEYS.map(k => {
                const taken = classes.find(c => c.shortcut === k && c.id !== editing?.id)
                return (
                  <button key={k} onClick={() => setForm(f => ({ ...f, shortcut: f.shortcut === k ? '' : k }))}
                    disabled={!!taken}
                    style={{
                      width: 32, height: 32, borderRadius: 5, border: '1px solid',
                      borderColor: form.shortcut === k ? 'var(--accent)' : 'var(--surface-border)',
                      background: form.shortcut === k ? 'var(--accent)' : taken ? 'var(--surface)' : 'var(--surface-raised)',
                      color: taken ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 13, cursor: taken ? 'not-allowed' : 'pointer',
                    }}>{k}</button>
                )
              })}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Color</label>
            <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <Button variant="ghost" onClick={() => setShowModal(false)} icon={X}>Cancel</Button>
            <Button onClick={save} icon={Check}>Save Class</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
