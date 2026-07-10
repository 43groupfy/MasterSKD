'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import AdminShell from '../components/AdminShell'
import PackageModal from '../components/PackageModal'
import SelectQuestionsModal from '../components/SelectQuestionsModal'

const ITEMS_PER_PAGE = 15

export default function Packages() {
  const [packages, setPackages]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('All')
  const [page, setPage]           = useState(1)
  const [toast, setToast]         = useState(null)

  // Modal state
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [editingPackage, setEditingPackage]      = useState(null)
  const [showSelectModal, setShowSelectModal]    = useState(false)
  const [activePackageId, setActivePackageId]    = useState(null)
  const [activePackageQCount, setActivePackageQCount] = useState(0)
  const [confirmDelete, setConfirmDelete]        = useState(null)
  const [deleting, setDeleting]                  = useState(false)

  useEffect(() => { fetchPackages() }, [])

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchPackages = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('exam_packages')
      .select('*, exam_package_items(count)')
      .order('created_at', { ascending: false })

    if (!error) {
      const mapped = (data || []).map(p => ({
        ...p,
        item_count: p.exam_package_items?.[0]?.count || 0,
      }))
      setPackages(mapped)
    } else {
      showToast('danger', 'Gagal memuat paket: ' + error.message)
    }
    setLoading(false)
  }

  // ── CREATE / UPDATE (step 1: package info) ──────────────────
  const handleOpenCreate = () => {
    setEditingPackage(null)
    setShowPackageModal(true)
  }

  const handleOpenEdit = (pkg) => {
    setEditingPackage(pkg)
    setShowPackageModal(true)
  }

  const handleSavePackageInfo = async (formData) => {
    const { data: { user } } = await supabase.auth.getUser()

    if (editingPackage) {
      // UPDATE
      const { error } = await supabase
        .from('exam_packages')
        .update({
          name: formData.name,
          description: formData.description,
          total_questions: formData.totalQuestions,
          status: formData.status,
          admin_notes: formData.notes,
          updated_by: user?.id,
        })
        .eq('id', editingPackage.id)

      if (error) { showToast('danger', 'Gagal update: ' + error.message); return }
      showToast('success', 'Paket berhasil diperbarui!')
      setShowPackageModal(false)
      fetchPackages()
    } else {
      // CREATE
      const { data: pkg, error } = await supabase
        .from('exam_packages')
        .insert({
          name: formData.name,
          description: formData.description,
          total_questions: formData.totalQuestions,
          status: formData.status,
          admin_notes: formData.notes,
          updated_by: user?.id,
        })
        .select()
        .single()

      if (error) { showToast('danger', 'Gagal membuat paket: ' + error.message); return }

      setShowPackageModal(false)
      // Lanjut ke step pilih soal
      setActivePackageId(pkg.id)
      setActivePackageQCount(formData.totalQuestions)
      setShowSelectModal(true)
      showToast('success', 'Paket dibuat! Sekarang pilih soal-soalnya.')
    }
  }

  // ── Pilih soal untuk paket ───────────────────────────────────
  const handleOpenSelectQuestions = (pkg) => {
    setActivePackageId(pkg.id)
    setActivePackageQCount(pkg.total_questions)
    setShowSelectModal(true)
  }

  const handleQuestionsSaved = () => {
    setShowSelectModal(false)
    showToast('success', 'Soal berhasil disimpan ke paket!')
    fetchPackages()
  }

  // ── DELETE ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    const { error } = await supabase.from('exam_packages').delete().eq('id', confirmDelete.id)
    setDeleting(false)
    if (error) { showToast('danger', 'Gagal menghapus: ' + error.message); return }
    setConfirmDelete(null)
    showToast('success', 'Paket berhasil dihapus.')
    fetchPackages()
  }

  // ── TOGGLE STATUS ─────────────────────────────────────────────
  const handleToggleStatus = async (pkg) => {
    const newStatus = pkg.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase.from('exam_packages').update({ status: newStatus }).eq('id', pkg.id)
    if (!error) {
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, status: newStatus } : p))
      showToast('success', newStatus === 'published' ? 'Paket dipublikasikan!' : 'Paket dijadikan draft.')
    }
  }

  // ── DUPLICATE ─────────────────────────────────────────────────
  const handleDuplicate = async (pkg) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: newPkg, error } = await supabase
      .from('exam_packages')
      .insert({
        name: `${pkg.name} (Copy)`,
        description: pkg.description,
        total_questions: pkg.total_questions,
        status: 'draft',
        admin_notes: pkg.admin_notes,
        updated_by: user?.id,
      })
      .select()
      .single()

    if (error) { showToast('danger', 'Gagal duplikasi: ' + error.message); return }

    const { data: items } = await supabase
      .from('exam_package_items')
      .select('question_id, order_number')
      .eq('package_id', pkg.id)

    if (items?.length) {
      await supabase.from('exam_package_items').insert(
        items.map(it => ({ package_id: newPkg.id, question_id: it.question_id, order_number: it.order_number }))
      )
    }

    showToast('success', 'Paket berhasil diduplikasi!')
    fetchPackages()
  }

  // ── Filter & Pagination ──────────────────────────────────────
  const filtered = packages.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const COUNTS = {
    All: packages.length,
    draft: packages.filter(p => p.status === 'draft').length,
    published: packages.filter(p => p.status === 'published').length,
  }

  return (
    <AdminShell title="Paket Soal" subtitle="Kelola">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 999, background: toast.type === 'success' ? 'var(--brand-accent)' : 'var(--color-danger)', color: 'white', padding: '12px 20px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '600', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Kelola Paket Soal 📦</h1>
          <p>{packages.length} paket tersimpan · {filtered.length} ditampilkan</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleOpenCreate}>+ Paket Baru</button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs">
        {[['All','Semua'],['draft','Draft'],['published','Published']].map(([val, lbl]) => (
          <button key={val} className={`tab-btn${filterStatus === val ? ' active' : ''}`}
            onClick={() => { setFilter(val); setPage(1) }}>
            {lbl}
            <span style={{ marginLeft: '6px', fontSize: '11px', background: filterStatus === val ? 'var(--brand-primary-light)' : 'var(--gray-100)', color: filterStatus === val ? 'var(--brand-primary)' : 'var(--gray-500)', padding: '1px 6px', borderRadius: '99px', fontWeight: '700' }}>
              {COUNTS[val]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Cari nama paket..." className="input input-search"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-screen"><div className="spinner"></div><span className="loading-text">Memuat paket soal...</span></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Paket</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Soal Terisi</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '120px' }}>Dibuat</th>
                <th style={{ width: '220px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="5">
                  <div className="table-empty">
                    <div className="table-empty-icon">📦</div>
                    <div className="table-empty-text">Belum ada paket soal</div>
                    <div className="table-empty-sub">Klik "+ Paket Baru" untuk membuat paket pertama</div>
                  </div>
                </td></tr>
              ) : paginated.map(pkg => {
                const isComplete = pkg.item_count >= pkg.total_questions
                return (
                  <tr key={pkg.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--gray-800)' }}>{pkg.name}</div>
                      {pkg.description && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' }}>{pkg.description}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: isComplete ? 'var(--brand-accent)' : 'var(--color-warning)' }}>
                        {pkg.item_count}/{pkg.total_questions}
                      </span>
                      {!isComplete && <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>belum lengkap</div>}
                    </td>
                    <td>
                      <button
                        className={`badge badge-${pkg.status === 'published' ? 'active' : 'inactive'}`}
                        style={{ border: 'none', cursor: 'pointer' }}
                        onClick={() => handleToggleStatus(pkg)}
                        title="Klik untuk ubah status"
                      >
                        {pkg.status === 'published' ? '🟢 Published' : '⚪ Draft'}
                      </button>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                      {new Date(pkg.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div className="action-menu" style={{ justifyContent: 'center' }}>
                        <button className="icon-btn" title="Pilih/Edit Soal" onClick={() => handleOpenSelectQuestions(pkg)}>🎯</button>
                        <button className="icon-btn" title="Edit Info Paket" onClick={() => handleOpenEdit(pkg)}>✏️</button>
                        <button className="icon-btn" title="Duplikasi" onClick={() => handleDuplicate(pkg)}>📋</button>
                        <button className="icon-btn danger" title="Hapus" onClick={() => setConfirmDelete(pkg)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Menampilkan {((page-1)*ITEMS_PER_PAGE)+1}–{Math.min(page*ITEMS_PER_PAGE, filtered.length)} dari {filtered.length}</span>
              <div className="pagination-btns">
                <button className="page-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>‹</button>
                {Array.from({ length: Math.min(5,totalPages) }, (_,i) => {
                  let p = i+1
                  if (totalPages > 5 && page > 3) p = page-2+i
                  if (p > totalPages) return null
                  return <button key={p} className={`page-btn${page===p?' active':''}`} onClick={() => setPage(p)}>{p}</button>
                })}
                <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Package Create/Edit Modal */}
      {showPackageModal && (
        <PackageModal
          pkg={editingPackage}
          onClose={() => setShowPackageModal(false)}
          onSave={handleSavePackageInfo}
        />
      )}

      {/* Select Questions Modal */}
      {showSelectModal && (
        <SelectQuestionsModal
          packageId={activePackageId}
          totalQuestions={activePackageQCount}
          onClose={() => setShowSelectModal(false)}
          onSaved={handleQuestionsSaved}
        />
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-body" style={{ padding: '32px 28px', textAlign: 'center' }}>
              <div className="confirm-icon danger" style={{ width: '60px', height: '60px', margin: '0 auto 16px' }}>🗑️</div>
              <div className="modal-title" style={{ marginBottom: '8px' }}>Hapus Paket?</div>
              <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '24px' }}>
                Paket <strong>{confirmDelete.name}</strong> dan semua relasi soalnya akan dihapus permanen.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Batal</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
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