'use client'
import { useState } from 'react'

export default function PackageModal({ pkg, onClose, onSave }) {
  const isEdit = !!pkg

  const [name, setName]               = useState(pkg?.name || '')
  const [description, setDescription] = useState(pkg?.description || '')
  const [totalQuestions, setTotal]    = useState(pkg?.total_questions ?? 110)
  const [status, setStatus]           = useState(pkg?.status || 'draft')
  const [notes, setNotes]             = useState(pkg?.admin_notes || '')
  const [saving, setSaving]           = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      name,
      description,
      totalQuestions: Number(totalQuestions),
      status,
      notes,
    })
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? '✏️ Edit Paket Soal' : '📝 Buat Paket Soal'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nama Paket <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                className="form-input" required
                placeholder="cth: Paket Tryout SKD #2"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea
                className="form-input form-textarea" rows="3"
                placeholder="Simulasi ujian SKD dengan tingkat kesulitan sedang..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Soal yang akan ditambahkan <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                type="number" className="form-input" required min="1" max="200"
                value={totalQuestions}
                onChange={e => setTotal(e.target.value)}
              />
              <div className="form-hint">Setelah disimpan, kamu akan diarahkan untuk memilih soal sejumlah ini.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button"
                  className={`btn btn-sm${status === 'draft' ? ' btn-primary' : ' btn-ghost'}`}
                  onClick={() => setStatus('draft')}
                  style={{ flex: 1 }}
                >⚪ Draft</button>
                <button type="button"
                  className={`btn btn-sm${status === 'published' ? ' btn-primary' : ' btn-ghost'}`}
                  onClick={() => setStatus('published')}
                  style={{ flex: 1 }}
                >🟢 Published</button>
              </div>
              <div className="form-hint">Draft tidak tampil ke pengguna. Published langsung bisa diakses.</div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Catatan Admin (opsional)</label>
              <textarea
                className="form-input form-textarea" rows="2"
                placeholder="Catatan internal, tidak terlihat pengguna..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Menyimpan...' : isEdit ? '💾 Simpan Perubahan' : 'Lanjut Pilih Soal →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}