'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import AdminShell from '../components/AdminShell'

const ITEMS_PER_PAGE = 15

export default function Questions() {
  const router = useRouter()
  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterLabel, setFilter]  = useState('All')
  const [page, setPage]           = useState(1)
  const [deleting, setDeleting]   = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => { fetchQuestions() }, [])

  const fetchQuestions = async () => {
    setLoading(true)
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false })
    setList(data || [])
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirmId) return
    setDeleting(confirmId)
    await supabase.from('questions').delete().eq('id', confirmId)
    setConfirmId(null)
    setDeleting(null)
    fetchQuestions()
  }

  const filtered = list.filter(item => {
    const matchSearch = !search ||
      item.question_text?.toLowerCase().includes(search.toLowerCase()) ||
      item.sub_label?.toLowerCase().includes(search.toLowerCase())
    const matchLabel = filterLabel === 'All' || item.label === filterLabel
    return matchSearch && matchLabel
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const LABEL_COUNTS = {
    All: list.length,
    TWK: list.filter(q => q.label === 'TWK').length,
    TIU: list.filter(q => q.label === 'TIU').length,
    TKP: list.filter(q => q.label === 'TKP').length,
  }

  return (
    <AdminShell title="Bank Soal" subtitle="Kelola">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Bank Soal 📚</h1>
          <p>{list.length} soal tersimpan · {filtered.length} ditampilkan</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => router.push('/add')}>
            + Tambah Soal
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs">
        {['All', 'TWK', 'TIU', 'TKP'].map(lbl => (
          <button
            key={lbl}
            className={`tab-btn${filterLabel === lbl ? ' active' : ''}`}
            onClick={() => { setFilter(lbl); setPage(1) }}
          >
            {lbl === 'All' ? 'Semua' : lbl}
            <span style={{ marginLeft: '6px', fontSize: '11px', background: filterLabel === lbl ? 'var(--brand-primary-light)' : 'var(--gray-100)', color: filterLabel === lbl ? 'var(--brand-primary)' : 'var(--gray-500)', padding: '1px 6px', borderRadius: '99px', fontWeight: '700' }}>
              {LABEL_COUNTS[lbl]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text" placeholder="Cari teks soal atau topik..."
            className="input input-search"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-screen"><div className="spinner"></div><span className="loading-text">Memuat bank soal...</span></div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Kategori</th>
                  <th>Teks Pertanyaan</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Opsi</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan="4">
                      <div className="table-empty">
                        <div className="table-empty-icon">📭</div>
                        <div className="table-empty-text">Soal tidak ditemukan</div>
                        <div className="table-empty-sub">Coba ubah kata kunci atau filter kategori</div>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(item => {
                  let opts = []
                  try { opts = typeof item.options === 'string' ? JSON.parse(item.options) : item.options || [] } catch {}
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className={`badge badge-${item.label?.toLowerCase()}`}>{item.label}</span>
                        {item.sub_label && <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '4px' }}>{item.sub_label}</div>}
                      </td>
                      <td>
                        <div className="question-text-preview">{item.question_text}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-500)' }}>{opts.length} opsi</span>
                      </td>
                      <td>
                        <div className="action-menu" style={{ justifyContent: 'center' }}>
                          <button className="icon-btn" title="Edit" onClick={() => router.push(`/edit/${item.id}`)}>✏️</button>
                          <button className="icon-btn danger" title="Hapus" onClick={() => setConfirmId(item.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Menampilkan {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length}
                </span>
                <div className="pagination-btns">
                  <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = i + 1
                    if (totalPages > 5 && page > 3) p = page - 2 + i
                    if (p > totalPages) return null
                    return <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  })}
                  <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirm Delete Modal */}
      {confirmId && (
        <div className="modal-backdrop" onClick={() => setConfirmId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-body" style={{ padding: '32px 28px', textAlign: 'center' }}>
              <div className="confirm-icon danger" style={{ width: '60px', height: '60px', margin: '0 auto 16px' }}>🗑️</div>
              <div className="modal-title" style={{ marginBottom: '8px' }}>Hapus Soal?</div>
              <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '24px' }}>
                Soal ini akan dihapus permanen dan tidak dapat dikembalikan.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>Batal</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={!!deleting}>
                  {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
