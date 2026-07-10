'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import AdminShell from '../components/AdminShell'

const STATUS_LABELS  = { active: 'Aktif', inactive: 'Nonaktif', banned: 'Banned' }

function getInitials(email) {
  return (email || '?').charAt(0).toUpperCase()
}

function formatDate(ts) {
  if (!ts) return '–'
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatLastSeen(ts) {
  if (!ts) return 'Belum pernah'
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} menit lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  return `${Math.floor(hrs / 24)} hari lalu`
}

export default function Users() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilter]   = useState('All')
  const [filterMember, setFMember]  = useState('All')
  const [selectedUser, setSelected] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [confirmBan, setConfirmBan] = useState(null)
  const [page, setPage]             = useState(1)
  const [toast, setToast]           = useState(null)
  const ITEMS = 15

  useEffect(() => { fetchUsers() }, [])

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchUsers = async () => {
    setLoading(true)

    // Ambil semua user_profiles termasuk full_name dan email
    const { data: profiles, error: pErr } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, status, membership, created_at, updated_at')

    if (pErr) { console.error(pErr); setLoading(false); return }

    // Ambil user_stats untuk data tambahan (streak, xp, best_score)
    const { data: stats } = await supabase
      .from('user_stats')
      .select('user_id, total_attempts, best_score, total_xp, streak, last_attempt_at')

    // Map stats by user_id
    const statsMap = {}
    ;(stats || []).forEach(s => { statsMap[s.user_id] = s })

    // Gabungkan
    const merged = (profiles || []).map(p => ({
      ...p,
      stats: statsMap[p.id] || null,
    }))

    setUsers(merged)
    setLoading(false)
  }

  const handleStatusChange = async (userId, newStatus) => {
    setSaving(true)
    const { error } = await supabase
      .from('user_profiles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
      if (selectedUser?.id === userId) setSelected(prev => ({ ...prev, status: newStatus }))
      showToast('success', `Status berhasil diubah ke "${STATUS_LABELS[newStatus]}"`)
    } else {
      showToast('danger', 'Gagal mengubah status: ' + error.message)
    }
    setSaving(false)
    setConfirmBan(null)
  }

  const handleMembershipChange = async (userId, newMembership) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ membership: newMembership, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, membership: newMembership } : u))
      if (selectedUser?.id === userId) setSelected(prev => ({ ...prev, membership: newMembership }))
      showToast('success', `Membership diubah ke "${newMembership}"`)
    } else {
      showToast('danger', 'Gagal mengubah membership')
    }
  }

  // Mengubah logika pencarian agar memeriksa nama atau email
  const filtered = users.filter(u => {
    const query = search.toLowerCase()
    const matchSearch = !search || 
      (u.full_name && u.full_name.toLowerCase().includes(query)) || 
      (u.email && u.email.toLowerCase().includes(query))
      
    const matchStatus = filterStatus === 'All' || u.status === filterStatus
    const matchMember = filterMember === 'All' || u.membership === filterMember
    return matchSearch && matchStatus && matchMember
  })

  const totalPages = Math.ceil(filtered.length / ITEMS)
  const paginated  = filtered.slice((page - 1) * ITEMS, page * ITEMS)

  const COUNTS = {
    All:      users.length,
    active:   users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    banned:   users.filter(u => u.status === 'banned').length,
  }

  return (
    <AdminShell title="Pengguna" subtitle="Kelola">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 999, background: toast.type === 'success' ? 'var(--brand-accent)' : 'var(--color-danger)', color: 'white', padding: '12px 20px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: '600', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '8px', animation: 'modal-in 0.2s ease' }}>
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Kelola Pengguna 👥</h1>
          <p>{users.length} pengguna terdaftar</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs">
        {[['All','Semua'],['active','Aktif'],['inactive','Nonaktif'],['banned','Banned']].map(([val, lbl]) => (
          <button key={val} className={`tab-btn${filterStatus === val ? ' active' : ''}`}
            onClick={() => { setFilter(val); setPage(1) }}>
            {lbl}
            <span style={{ marginLeft: '6px', fontSize: '11px', background: filterStatus === val ? 'var(--brand-primary-light)' : 'var(--gray-100)', color: filterStatus === val ? 'var(--brand-primary)' : 'var(--gray-500)', padding: '1px 6px', borderRadius: '99px', fontWeight: '700' }}>
              {COUNTS[val]}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap" style={{ flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Cari nama atau email..." className="input input-search"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="select" value={filterMember} onChange={e => { setFMember(e.target.value); setPage(1) }}>
          <option value="All">Semua Membership</option>
          <option value="premium">⭐ Premium</option>
          <option value="free">🆓 Free</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-screen"><div className="spinner"></div><span className="loading-text">Memuat data pengguna...</span></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Statistik</th>
                <th>Membership</th>
                <th>Status</th>
                <th>Bergabung</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan="6">
                  <div className="table-empty">
                    <div className="table-empty-icon">👤</div>
                    <div className="table-empty-text">Pengguna tidak ditemukan</div>
                    <div className="table-empty-sub">Coba ubah filter atau kata kunci pencarian</div>
                  </div>
                </td></tr>
              ) : paginated.map(u => {
                const status = u.status || 'active'
                const membership = u.membership || 'free'
                const shortId = u.id.substring(0, 8).toUpperCase()
                const displayName = u.full_name || u.email || `#${shortId}`
                const displaySub  = u.full_name ? u.email : `ID: ${u.id.substring(0, 16)}...`
                const s = u.stats

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="user-avatar">{displayName.charAt(0).toUpperCase()}</div>
                        <div className="user-info">
                          <span className="user-name">{displayName}</span>
                          <span className="user-email">{displaySub}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {s ? (
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)', lineHeight: '1.8' }}>
                          <span title="XP">⚡ {s.total_xp || 0} XP</span>
                          {' · '}
                          <span title="Streak">🔥 {s.streak || 0}</span>
                          {' · '}
                          <span title="Best Score">🏆 {s.best_score || 0}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--gray-300)' }}>Belum ada aktivitas</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${membership}`}>
                        {membership === 'premium' ? '⭐ Premium' : '🆓 Free'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${status}`}>
                        {status === 'active' ? '✅' : status === 'banned' ? '🚫' : '⏸️'} {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                      {formatDate(u.created_at)}
                    </td>
                    <td>
                      <div className="action-menu" style={{ justifyContent: 'center' }}>
                        <button className="icon-btn" title="Lihat detail" onClick={() => setSelected(u)}>👁️</button>
                        {status !== 'banned' ? (
                          <button className="icon-btn danger" title="Ban pengguna" onClick={() => setConfirmBan(u)}>🚫</button>
                        ) : (
                          <button className="icon-btn success" title="Aktifkan kembali" onClick={() => handleStatusChange(u.id, 'active')}>✅</button>
                        )}
                        {membership !== 'premium' ? (
                          <button className="icon-btn" title="Upgrade ke Premium" onClick={() => handleMembershipChange(u.id, 'premium')}>⭐</button>
                        ) : (
                          <button className="icon-btn" title="Downgrade ke Free" onClick={() => handleMembershipChange(u.id, 'free')}>↓</button>
                        )}
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
              <span className="pagination-info">Menampilkan {((page-1)*ITEMS)+1}–{Math.min(page*ITEMS,filtered.length)} dari {filtered.length}</span>
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

      {/* Detail Modal */}
      {selectedUser && (() => {
        const shortId    = selectedUser.id.substring(0, 8).toUpperCase()
        const displayName = selectedUser.full_name || selectedUser.email || `#${shortId}`

        return (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <span className="modal-title">Detail Pengguna</span>
                <button className="modal-close" onClick={() => setSelected(null)}>×</button>
              </div>
              <div className="modal-body">
                {/* ID Card */}
                <div style={{ background: 'linear-gradient(135deg, var(--brand-primary), #7c3aed)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px', color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{displayName}</div>
                      <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{selectedUser.email || selectedUser.id}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '14px', fontSize: '12px' }}>
                    <span>📅 Bergabung {formatDate(selectedUser.created_at)}</span>
                  </div>
                </div>

                {/* Stats */}
                {selectedUser.stats && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { icon: '⚡', label: 'Total XP', value: selectedUser.stats.total_xp || 0 },
                      { icon: '🔥', label: 'Streak', value: `${selectedUser.stats.streak || 0} hari` },
                      { icon: '🏆', label: 'Best Score', value: selectedUser.stats.best_score || 0 },
                      { icon: '📝', label: 'Attempts', value: selectedUser.stats.total_attempts || 0 },
                      { icon: '🕐', label: 'Last Active', value: formatLastSeen(selectedUser.stats.last_attempt_at), small: true },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.icon}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: item.small ? '11px' : '18px', color: 'var(--gray-900)' }}>{item.value}</div>
                      <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>{item.label}</div>
                    </div>
                    ))}
                  </div>
                )}

                {/* Status Control */}
                <div style={{ marginBottom: '16px' }}>
                  <div className="form-label" style={{ marginBottom: '8px' }}>Status Akun</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[['active','✅ Aktif'],['inactive','⏸️ Nonaktif'],['banned','🚫 Banned']].map(([s, lbl]) => (
                      <button key={s}
                        className={`btn btn-sm${selectedUser.status === s ? ' btn-primary' : ' btn-ghost'}`}
                        onClick={() => handleStatusChange(selectedUser.id, s)}
                        disabled={saving}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Membership Control */}
                <div>
                  <div className="form-label" style={{ marginBottom: '8px' }}>Membership</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[['free','🆓 Free'],['premium','⭐ Premium']].map(([m, lbl]) => (
                      <button key={m}
                        className={`btn btn-sm${(selectedUser.membership || 'free') === m ? ' btn-primary' : ' btn-ghost'}`}
                        onClick={() => handleMembershipChange(selectedUser.id, m)}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setSelected(null)}>Tutup</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Confirm Ban Modal */}
      {confirmBan && (
        <div className="modal-backdrop" onClick={() => setConfirmBan(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="modal-body" style={{ padding: '32px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚫</div>
              <div className="modal-title" style={{ marginBottom: '8px' }}>Ban Pengguna?</div>
              <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '6px' }}>
                User <strong>{confirmBan.full_name || confirmBan.email || `#${confirmBan.id.substring(0,8).toUpperCase()}`}</strong> akan diblokir dan tidak bisa mengakses aplikasi.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                <button className="btn btn-ghost" onClick={() => setConfirmBan(null)}>Batal</button>
                <button className="btn btn-danger" onClick={() => handleStatusChange(confirmBan.id, 'banned')} disabled={saving}>
                  {saving ? 'Memproses...' : 'Ya, Ban'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}