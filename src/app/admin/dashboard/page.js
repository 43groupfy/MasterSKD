'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import AdminShell from '../components/AdminShell'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats]     = useState({ totalQ: 0, twk: 0, tiu: 0, tkp: 0, totalUsers: 0, activeUsers: 0, bannedUsers: 0, premiumUsers: 0 })
  const [topUsers, setTopUsers]   = useState([])
  const [recentUsers, setRecent]  = useState([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [qRes, pRes, sRes] = await Promise.all([
      supabase.from('questions').select('id, label'),
      // Menambahkan full_name dan email ke query agar displayName bisa mengambil data dengan benar
      supabase.from('user_profiles').select('id, full_name, email, status, membership, created_at'),
      supabase.from('user_stats').select('user_id, best_score, total_xp, streak, total_attempts').order('total_xp', { ascending: false }).limit(5),
    ])

    const q = qRes.data  || []
    const p = pRes.data  || []
    const s = sRes.data  || []

    setStats({
      totalQ:       q.length,
      twk:          q.filter(x => x.label === 'TWK').length,
      tiu:          q.filter(x => x.label === 'TIU').length,
      tkp:          q.filter(x => x.label === 'TKP').length,
      totalUsers:   p.length,
      activeUsers:  p.filter(x => x.status === 'active').length,
      bannedUsers:  p.filter(x => x.status === 'banned').length,
      premiumUsers: p.filter(x => x.membership === 'premium').length,
    })

    setTopUsers(s)

    // 5 user terbaru
    const recent = [...p].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
    setRecent(recent)

    setLoading(false)
  }

  const totalQForBar = stats.twk + stats.tiu + stats.tkp || 1

  const STAT_CARDS = [
    { icon: '📝', label: 'Total Soal',      value: stats.totalQ,       sub: `${stats.twk} TWK · ${stats.tiu} TIU · ${stats.tkp} TKP`, shadow: '0 4px 0 #c7d2fe', iconBg: 'var(--brand-primary-light)' },
    { icon: '👥', label: 'Total Pengguna',  value: stats.totalUsers,   sub: 'Akun terdaftar',        shadow: '0 4px 0 #bfdbfe', iconBg: '#dbeafe' },
    { icon: '✅', label: 'Pengguna Aktif',  value: stats.activeUsers,  sub: 'Status aktif',          shadow: '0 4px 0 #bbf7d0', iconBg: 'var(--color-success-light)' },
    { icon: '⭐', label: 'Premium',         value: stats.premiumUsers, sub: 'Member berbayar',       shadow: '0 4px 0 #fde68a', iconBg: '#fef3c7' },
  ]

  return (
    <AdminShell title="Dashboard" subtitle="Overview">
      {loading ? (
        <div className="loading-screen"><div className="spinner"></div><span className="loading-text">Memuat data...</span></div>
      ) : (
        <>
          {/* Greeting */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: '900', color: 'var(--gray-900)', marginBottom: '4px' }}>
              Overview Dashboard 🏆
            </h1>
            <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>Pantau statistik dan aktivitas terkini PlaySKD</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-4" style={{ marginBottom: '28px' }}>
            {STAT_CARDS.map(card => (
              <div key={card.label} className="stat-card" style={{ boxShadow: card.shadow }}>
                <div className="stat-card-icon" style={{ background: card.iconBg }}>{card.icon}</div>
                <div className="stat-card-value">{card.value}</div>
                <div className="stat-card-label">{card.label}</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '6px' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Two Column */}
          <div className="grid grid-2">
            {/* Distribusi Soal */}
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">📊 Distribusi Bank Soal</span>
              </div>
              <div className="card-body">
                {[
                  { label: 'TWK', count: stats.twk, color: 'var(--color-twk)', bg: 'var(--color-twk-light)' },
                  { label: 'TIU', count: stats.tiu, color: 'var(--color-tiu)', bg: 'var(--color-tiu-light)' },
                  { label: 'TKP', count: stats.tkp, color: 'var(--color-tkp)', bg: 'var(--color-tkp-light)' },
                ].map(cat => {
                  const pct = Math.round((cat.count / totalQForBar) * 100)
                  return (
                    <div key={cat.label} style={{ marginBottom: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="badge" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gray-700)' }}>
                          {cat.count} soal <span style={{ color: 'var(--gray-400)', fontWeight: '400' }}>({pct}%)</span>
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: cat.color }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Users by XP */}
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">🏅 Top Pengguna (XP Tertinggi)</span>
              </div>
              <div style={{ padding: '0 20px 20px' }}>
                {topUsers.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>Belum ada data statistik</div>
                ) : topUsers.map((u, i) => {
                  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣']
                  const shortId = u.user_id.substring(0, 8).toUpperCase()
                  return (
                    <div key={u.user_id} className="activity-item">
                      <span style={{ fontSize: '20px', width: '24px', textAlign: 'center', flexShrink: 0 }}>{medals[i]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-800)', fontFamily: 'monospace' }}>#{shortId}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>🔥 {u.streak || 0} streak · 📝 {u.total_attempts || 0} soal</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', color: 'var(--brand-primary)' }}>{u.total_xp || 0}</div>
                        <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>XP</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pengguna Terbaru */}
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">🆕 Pendaftar Terbaru</span>
              </div>
              <div style={{ padding: '0 20px 20px' }}>
                {recentUsers.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>Belum ada pengguna</div>
                ) : recentUsers.map(u => {
                  const displayName = u.full_name || u.email || `#${u.id.substring(0,8).toUpperCase()}`
                  const date = new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                  return (
                    <div key={u.id} className="activity-item">
                      <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{displayName.charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-800)' }}>{displayName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Bergabung {date}</div>
                      </div>
                      <span className={`badge badge-${u.membership || 'free'}`}>
                        {u.membership === 'premium' ? '⭐ Premium' : '🆓 Free'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Info */}
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">📋 Ringkasan Sistem</span>
              </div>
              <div className="card-body">
                {[
                  { label: 'Total Soal Aktif',       value: stats.totalQ,       icon: '📝' },
                  { label: 'Pengguna Terdaftar',      value: stats.totalUsers,   icon: '👥' },
                  { label: 'Akun Dibanned',           value: stats.bannedUsers,  icon: '🚫' },
                  { label: 'Member Premium',          value: stats.premiumUsers, icon: '⭐' },
                  { label: 'Tingkat Premium',
                    value: stats.totalUsers > 0 ? `${Math.round((stats.premiumUsers / stats.totalUsers) * 100)}%` : '0%',
                    icon: '📈' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>{item.icon} {item.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '16px', color: 'var(--gray-900)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  )
}