'use client'
import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import AdminShell from '../components/AdminShell'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const EMPTY_OPTIONS = { A: { text: '', value: 0 }, B: { text: '', value: 0 }, C: { text: '', value: 0 }, D: { text: '', value: 0 }, E: { text: '', value: 0 } }

export default function AddQuestion() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('manual')

  // Manual form state
  const [label, setLabel]           = useState('TWK')
  const [subLabel, setSubLabel]     = useState('')
  const [questionText, setQuestion] = useState('')
  const [explanation, setExplan]    = useState('')
  const [options, setOptions]       = useState(EMPTY_OPTIONS)
  const [saving, setSaving]         = useState(false)
  const [success, setSuccess]       = useState(false)

  // Upload state
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleSaveManual = async (e) => {
    e.preventDefault()
    setSaving(true)
    const optionsArray = ['A','B','C','D','E'].map(k => ({ text: options[k].text, value: Number(options[k].value) }))
    const { error } = await supabase.from('questions').insert([{
      label, sub_label: subLabel, question_text: questionText,
      options: JSON.stringify(optionsArray), explanation
    }])
    setSaving(false)
    if (!error) {
      setSuccess(true)
      setLabel('TWK'); setSubLabel(''); setQuestion(''); setExplan(''); setOptions(EMPTY_OPTIONS)
      setTimeout(() => setSuccess(false), 3000)
    } else alert('Gagal menyimpan: ' + error.message)
  }

  const handleDownloadTemplate = () => {
    const tpl = [{ id: '', label: 'TWK', sub_label: 'Nasionalisme', question_text: 'Contoh pertanyaan?', options: '[{"text":"Pilihan A","value":5},{"text":"Pilihan B","value":0},{"text":"Pilihan C","value":0},{"text":"Pilihan D","value":0},{"text":"Pilihan E","value":0}]', explanation: 'Penjelasan jawaban benar.' }]
    const ws = XLSX.utils.json_to_sheet(tpl)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    ws['!cols'] = [{ wch: 20 }, { wch: 8 }, { wch: 18 }, { wch: 40 }, { wch: 80 }, { wch: 40 }]
    XLSX.writeFile(wb, 'Template_Upload_Soal_SKD.xlsx')
  }

  const handleUpload = (e) => {
    e.preventDefault()
    if (!file) return alert('Pilih file CSV terlebih dahulu!')
    setUploading(true)
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data.map(row => {
          const item = { label: row.label, sub_label: row.sub_label, question_text: row.question_text, options: row.options, explanation: row.explanation }
          if (row.id?.trim()) item.id = row.id.trim()
          return item
        })
        const { error } = await supabase.from('questions').upsert(data, { onConflict: 'id' })
        setUploading(false)
        if (!error) { alert(`✅ Berhasil memproses ${data.length} soal!`); router.push('/questions') }
        else alert('Gagal: ' + error.message)
      },
      error: (err) => { alert('Gagal baca CSV: ' + err.message); setUploading(false) }
    })
  }

  return (
    <AdminShell title="Bank Soal" subtitle="Tambah Soal">
      <div style={{ maxWidth: '760px' }}>
        {/* Back + Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/questions')}>← Kembali</button>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '900', color: 'var(--gray-900)' }}>Tambah Soal Baru</h1>
            <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Input manual atau upload massal via CSV</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab-btn${activeTab === 'manual' ? ' active' : ''}`} onClick={() => setActiveTab('manual')}>✏️ Input Manual</button>
          <button className={`tab-btn${activeTab === 'upload' ? ' active' : ''}`} onClick={() => setActiveTab('upload')}>📤 Upload CSV</button>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            <span>Soal berhasil disimpan! Formulir telah direset untuk input berikutnya.</span>
          </div>
        )}

        {/* Manual Form */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSaveManual} className="card card-padded">
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
              <textarea className="form-input form-textarea" rows="4" required placeholder="Tulis teks pertanyaan di sini..." value={questionText} onChange={e => setQuestion(e.target.value)} />
            </div>

            <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px' }}>
              <div className="section-title">🎯 Pilihan Jawaban & Bobot Nilai</div>
              <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '16px' }}>TWK/TIU: jawaban benar = nilai 5, salah = 0. TKP: semua opsi punya nilai 1–5.</div>
              {['A','B','C','D','E'].map(k => (
                <div key={k} className="option-row">
                  <div className="option-label-badge">{k}</div>
                  <input required className="form-input" style={{ flex: 1 }} placeholder={`Teks pilihan ${k}`} value={options[k].text} onChange={e => setOptions({ ...options, [k]: { ...options[k], text: e.target.value } })} />
                  <input required type="number" min="0" max="5" className="form-input" style={{ width: '80px' }} title="Nilai (0–5)" value={options[k].value} onChange={e => setOptions({ ...options, [k]: { ...options[k], value: e.target.value } })} />
                </div>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Pembahasan Jawaban <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <textarea className="form-input form-textarea" rows="3" required placeholder="Jelaskan mengapa jawaban tersebut benar..." value={explanation} onChange={e => setExplan(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--gray-100)' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Menyimpan...' : '💾 Simpan Soal'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => router.push('/questions')}>Batal</button>
            </div>
          </form>
        )}

        {/* Upload CSV */}
        {activeTab === 'upload' && (
          <div className="card card-padded">
            <div className="alert alert-info" style={{ marginBottom: '24px' }}>
              <span className="alert-icon">💡</span>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Panduan Upload</div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', lineHeight: '1.8' }}>
                  <li>Kosongkan kolom <strong>id</strong> untuk soal baru</li>
                  <li>Isi kolom <strong>id</strong> untuk update soal yang ada</li>
                  <li>Simpan file Excel sebagai <strong>.CSV</strong> sebelum upload</li>
                </ul>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <button className="btn btn-ghost" onClick={handleDownloadTemplate}>📥 Download Template Excel</button>
            </div>

            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label className="form-label">File CSV</label>
                <input type="file" accept=".csv" required onChange={e => setFile(e.target.files[0])}
                  style={{ width: '100%', padding: '20px', border: '2px dashed var(--gray-300)', borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', cursor: 'pointer', fontSize: '14px', color: 'var(--gray-600)' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? '⏳ Memproses...' : '🚀 Mulai Upload'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => router.push('/questions')}>Batal</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
