'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase'
import { useRouter } from 'next/navigation'
import AdminShell from '../../components/AdminShell'

export default function EditQuestion({ params }) {
  const router = useRouter()
  const { id } = params
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [realDbId, setRealDbId] = useState(id)

  const [label, setLabel]           = useState('TWK')
  const [subLabel, setSubLabel]     = useState('')
  const [questionText, setQuestion] = useState('')
  const [explanation, setExplan]    = useState('')
  const [options, setOptions]       = useState({
    A: { text: '', value: 0 }, B: { text: '', value: 0 }, C: { text: '', value: 0 }, D: { text: '', value: 0 }, E: { text: '', value: 0 }
  })

  useEffect(() => {
    const fetch = async () => {
      const cleanId = decodeURIComponent(id).trim()
      const { data } = await supabase.from('questions').select('*').ilike('id', `%${cleanId}%`)
      const q = Array.isArray(data) ? data[0] : data
      if (q) {
        setRealDbId(q.id)
        setLabel(q.label || 'TWK')
        setSubLabel(q.sub_label || '')
        setQuestion(q.question_text || '')
        setExplan(q.explanation || '')
        if (q.options) {
          const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
          const labels = ['A','B','C','D','E']
          const mapped = { ...options }
          parsed.forEach((opt, i) => { if (labels[i]) mapped[labels[i]] = { text: opt.text, value: Number(opt.value) || 0 } })
          setOptions(mapped)
        }
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const optionsArray = ['A','B','C','D','E'].map(k => ({ text: options[k].text, value: Number(options[k].value) }))
    const { error } = await supabase.from('questions').update({
      label, sub_label: subLabel, question_text: questionText,
      options: JSON.stringify(optionsArray), explanation
    }).eq('id', realDbId)
    if (!error) router.push('/questions')
    else { alert('Gagal menyimpan: ' + error.message); setSaving(false) }
  }

  if (loading) return (
    <AdminShell title="Bank Soal" subtitle="Edit Soal">
      <div className="loading-screen"><div className="spinner"></div><span className="loading-text">Memuat data soal...</span></div>
    </AdminShell>
  )

  return (
    <AdminShell title="Bank Soal" subtitle="Edit Soal">
      <div style={{ maxWidth: '760px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/questions')}>← Kembali</button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '900', color: 'var(--gray-900)' }}>Edit Soal</h1>
            <p style={{ fontSize: '13px', color: 'var(--gray-500)', fontFamily: 'monospace' }}>ID: {String(realDbId).substring(0, 16)}...</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="card card-padded">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Kategori Soal</label>
              <select className="form-input" value={label} onChange={e => setLabel(e.target.value)}>
                <option value="TWK">TWK – Tes Wawasan Kebangsaan</option>
                <option value="TIU">TIU – Tes Intelegensia Umum</option>
                <option value="TKP">TKP – Tes Karakteristik Pribadi</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Topik / Sub Label</label>
              <input className="form-input" placeholder="cth: Nasionalisme" value={subLabel} onChange={e => setSubLabel(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Teks Pertanyaan <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea className="form-input form-textarea" rows="4" required value={questionText} onChange={e => setQuestion(e.target.value)} />
          </div>

          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px' }}>
            <div className="section-title">🎯 Pilihan Jawaban & Bobot Nilai</div>
            {['A','B','C','D','E'].map(k => (
              <div key={k} className="option-row">
                <div className="option-label-badge">{k}</div>
                <input required className="form-input" style={{ flex: 1 }} value={options[k].text} onChange={e => setOptions({ ...options, [k]: { ...options[k], text: e.target.value } })} />
                <input required type="number" min="0" max="5" className="form-input" style={{ width: '80px' }} value={options[k].value} onChange={e => setOptions({ ...options, [k]: { ...options[k], value: e.target.value } })} />
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Pembahasan Jawaban <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea className="form-input form-textarea" rows="3" required value={explanation} onChange={e => setExplan(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--gray-100)' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Menyimpan...' : '💾 Simpan Perubahan'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => router.push('/questions')}>Batal</button>
          </div>
        </form>
      </div>
    </AdminShell>
  )
}
