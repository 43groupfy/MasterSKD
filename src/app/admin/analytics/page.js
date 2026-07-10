'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import AdminShell from '../components/AdminShell'

function BarRow({ label, count, max, color }) {
  const pct = max ? Math.round((count / max) * 100) : 0
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--gray-700)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--gray-900)' }}>
          {count} <span style={{ color: 'var(--gray-400)', fontWeight: '400' }}>({pct}%)</span>
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }}></div>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions]   = useState([])
  const [profiles, setProfiles]     = useState([])
  const [userStats, setUserStats]   = useState([])
  const [examHistory, setExamHistory] = useState([])

  useEffect(() => {
    const load = async () => {
      const [qRes, pRes, sRes, eRes] = await Promise.all([
        supabase.from('questions').select('id, label, sub_label'),
        supabase.from('user_profiles').select('id, status, membership, created_at'),
        supabase.from('user_stats').select('user_id, total_attempts, best_score, total_xp, streak'),
        supabase.from('exam_history').select('id, created_at, score').order('created_at', { ascending: false }).limit(200),
      ])
      setQuestions(qRes.data  || [])
      setProfiles(pRes.data   || [])
      setUserStats(sRes.data  || [])
      setExamHistory(eRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Question stats
  const totalQ = questions.length
  const twk    = questions.filter(q => q.label === 'TWK').length
  const tiu    = questions.filter(q => q.label === 'TIU').length
  const tkp    = questions.filter(q => q.label === 'TKP').length

  // Sub-label breakdown
  const subMap = {}
  questions.forEach(q => {
    const key = `${q.label} – ${q.sub_label || 'Umum'}`
    subMap[key] = (subMap[key] || 0) + 1
  })
  const topSubs = Object.entries(subMap).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // User stats
  const totalU   = profiles.length
  const active   = profiles.filter(u => u.status === 'active').length
  const banned   = profiles.filter(u => u.status === 'banned').length
  const inactive = profiles.filter(u => u.status === 'inactive').length
  const premium  = profiles.filter(u => u.membership === 'premium').length
  const free     = profiles.filter(u => u.membership === 'free' || !u.membership).length

  // User stats aggregates
  const totalAttempts = userStats.reduce((s, u) => s + (u.total_attempts || 0), 0)
  const avgXP         = userStats.length ? Math.round(userStats.reduce((s, u) => s + (u.total_xp || 0), 0) / userStats.length) : 0
  const maxStreak     = userStats.length ? Math.max(...userStats.map(u => u.streak || 0)) : 0
  const avgScore      = userStats.length ? Math.round(userStats.reduce((s, u) => s + (u.best_score || 0), 0) / userStats.length) : 0

  // Monthly registrations (6 bulan)
  const now = new Date()
  const monthlyReg = []
  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
    const count = profiles.filter(u => {
      if (!u.created_at) return false
      const c = new Date(u.created_at)
      return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear()
    }).length
    monthlyReg.push({ label, count })
  }
  const maxReg = Math.max(...monthlyReg.map(m => m.count), 1)

  // Monthly exam activity (6 bulan)
  const monthlyExam = []
  for (let i = 5; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
    const count = examHistory.filter(e => {
      if (!e.created_at) return false
      const c = new Date(e.created_at)
      return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear()
    }).length
    monthlyExam.push({ label, count })
  }
  const maxExam = Math.max(...monthlyExam.map(m => m.count), 1)

  function MiniBarChart({ data, maxVal, color }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', padding: '0 4px' }}>
        {data.map((m, i) => {
          const h = maxVal > 0 ? Math.max(4, Math.round((m.count / maxVal) * 100)) : 4
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color, minHeight: '16px' }}>{m.count > 0 ? m.count : ''}</span>
              <div style={{ width: '100%', height: `${h}px`, background: m.count > 0 ? color : 'var(--gray-100)', borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease' }}></div>
              <span style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: '600' }}>{m.label}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <AdminShell title="Analitik" subtitle="Statistik">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Analitik 📈</h1>
          <p>Statistik lengkap bank soal, pengguna, dan aktivitas PlaySKD</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div><span className="loading-text">Memuat data analitik...</span></div>
      ) : (
        <>
          {/* Top KPI Row */}
          <div className="grid grid-4" style={{ marginBottom: '28px' }}>
            {[
              { icon: '📝', label: 'Total Soal',     value: totalQ,         color: 'var(--brand-primary)', bg: 'var(--brand-primary-light)', shadow: '0 4px 0 #c7d2fe' },
              { icon: '👥', label: 'Total User',     value: totalU,         color: 'var(--color-tiu)',     bg: 'var(--color-tiu-light)',     shadow: '0 4px 0 #bfdbfe' },
              { icon: '📋', label: 'Total Attempts', value: totalAttempts,  color: 'var(--color-tkp)',     bg: 'var(--color-tkp-light)',     shadow: '0 4px 0 #fde68a' },
              { icon: '🏆', label: 'Avg Best Score', value: avgScore,       color: 'var(--brand-accent)',  bg: 'var(--color-success-light)', shadow: '0 4px 0 #bbf7d0' },
            ].map(c => (
              <div key={c.label} className="stat-card" style={{ boxShadow: c.shadow }}>
                <div className="stat-card-icon" style={{ background: c.bg }}>{c.icon}</div>
                <div className="stat-card-value" style={{ color: c.color }}>{c.value}</div>
                <div className="stat-card-label">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-2" style={{ marginBottom: '28px' }}>
            {/* Registrasi Bulanan */}
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">📅 Registrasi User (6 Bulan)</span>
              </div>
              <div className="card-body">
                {monthlyReg.every(m => m.count === 0) ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-400)', fontSize: '14px' }}>Belum ada data</div>
                ) : <MiniBarChart data={monthlyReg} maxVal={maxReg} color="var(--brand-primary)" />}
              </div>
            </div>

            {/* Aktivitas Ujian Bulanan */}
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">📝 Aktivitas Latihan (6 Bulan)</span>
              </div>
              <div className="card-body">
                {monthlyExam.every(m => m.count === 0) ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-400)', fontSize: '14px' }}>Belum ada riwayat latihan</div>
                ) : <MiniBarChart data={monthlyExam} maxVal={maxExam} color="var(--brand-accent)" />}
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: '28px' }}>
            {/* Distribusi Soal */}
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">📚 Distribusi Soal per Kategori</span>
              </div>
              <div className="card-body">
                <BarRow label="TWK – Tes Wawasan Kebangsaan"    count={twk} max={totalQ} color="var(--color-twk)" />
                <BarRow label="TIU – Tes Intelegensia Umum"     count={tiu} max={totalQ} color="var(--color-tiu)" />
                <BarRow label="TKP – Tes Karakteristik Pribadi" count={tkp} max={totalQ} color="var(--color-tkp)" />
                <div style={{ display: 'flex', height: '32px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '16px', gap: '3px' }}>
                  {twk > 0 && <div style={{ flex: twk, background: 'var(--color-twk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white' }}>TWK</div>}
                  {tiu > 0 && <div style={{ flex: tiu, background: 'var(--color-tiu)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white' }}>TIU</div>}
                  {tkp > 0 && <div style={{ flex: tkp, background: 'var(--color-tkp)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white' }}>TKP</div>}
                </div>
              </div>
            </div>

            {/* User Breakdown */}
            <div className="card">
              <div className="card-header">
                <span className="card-header-title">👥 Breakdown Pengguna</span>
              </div>
              <div className="card-body">
                <BarRow label="✅ Aktif"    count={active}   max={totalU} color="var(--brand-accent)" />
                <BarRow label="⏸️ Nonaktif" count={inactive} max={totalU} color="var(--gray-400)" />
                <BarRow label="🚫 Banned"   count={banned}   max={totalU} color="var(--color-danger)" />
                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--gray-100)', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>⭐ Premium</span>
                    <span style={{ fontWeight: '700', color: 'var(--gray-900)' }}>{premium} <span style={{ color: 'var(--gray-400)', fontWeight: '400' }}>({totalU > 0 ? Math.round(premium/totalU*100) : 0}%)</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>🆓 Free</span>
                    <span style={{ fontWeight: '700', color: 'var(--gray-900)' }}>{free} <span style={{ color: 'var(--gray-400)', fontWeight: '400' }}>({totalU > 0 ? Math.round(free/totalU*100) : 0}%)</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Stats */}
          <div className="card" style={{ marginBottom: '28px' }}>
            <div className="card-header">
              <span className="card-header-title">⚡ Statistik Engagement</span>
            </div>
            <div className="card-body">
              <div className="grid grid-4">
                {[
                  { icon: '📊', label: 'Total Percobaan', value: totalAttempts },
                  { icon: '⚡', label: 'Rata-rata XP',    value: avgXP },
                  { icon: '🔥', label: 'Streak Terpanjang', value: `${maxStreak} hari` },
                  { icon: '🏆', label: 'Rata-rata Skor',  value: avgScore },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center', padding: '16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '900', color: 'var(--gray-900)', marginBottom: '4px' }}>{item.value}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Topics */}
          <div className="card">
            <div className="card-header">
              <span className="card-header-title">🏷️ Topik Soal Terbanyak</span>
            </div>
            <div className="card-body">
              {topSubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-400)' }}>Belum ada data topik</div>
              ) : topSubs.map(([key, count], i) => {
                const lbl   = key.split(' – ')[0]
                const color = lbl === 'TWK' ? 'var(--color-twk)' : lbl === 'TIU' ? 'var(--color-tiu)' : 'var(--color-tkp)'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < topSubs.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                    <span style={{ width: '24px', height: '24px', background: 'var(--gray-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--gray-500)', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '14px', color: 'var(--gray-700)' }}>{key}</span>
                    <span style={{ background: color + '18', color, fontWeight: '700', fontSize: '13px', padding: '3px 10px', borderRadius: '99px' }}>{count} soal</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  )
}
