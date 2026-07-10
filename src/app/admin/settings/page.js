'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase'
import AdminShell from '../components/AdminShell'
import { useRouter } from 'next/navigation'

export default function Settings() {
  const router = useRouter()
  const [user, setUser]           = useState(null)
  const [email, setEmail]         = useState('')
  const [newPass, setNewPass]     = useState('')
  const [confirmPass, setConfirm] = useState('')
  const [savingPass, setSavingP]  = useState(false)
  const [msgPass, setMsgPass]     = useState(null)
  const [appName, setAppName]     = useState('PlaySKD')
  const [freeLimit, setFreeLimit] = useState('10')
  const [savingApp, setSavingApp] = useState(false)
  const [msgApp, setMsgApp]       = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) { setUser(data.user); setEmail(data.user.email || '') }
    }
    load()
  }, [])

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPass !== confirmPass) { setMsgPass({ type: 'danger', text: 'Password tidak cocok!' }); return }
    if (newPass.length < 6) { setMsgPass({ type: 'danger', text: 'Password minimal 6 karakter.' }); return }
    setSavingP(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (!error) {
      setMsgPass({ type: 'success', text: 'Password berhasil diubah!' })
      setNewPass(''); setConfirm('')
    } else setMsgPass({ type: 'danger', text: error.message })
    setSavingP(false)
    setTimeout(() => setMsgPass(null), 4000)
  }

  const handleSaveApp = async (e) => {
    e.preventDefault()
    setSavingApp(true)
    // In real app: save to a settings table in Supabase
    await new Promise(r => setTimeout(r, 800))
    setMsgApp({ type: 'success', text: 'Pengaturan aplikasi tersimpan!' })
    setSavingApp(false)
    setTimeout(() => setMsgApp(null), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AdminShell title="Pengaturan" subtitle="Konfigurasi">
      <div style={{ maxWidth: '680px' }}>
        <div className="page-header">
          <div className="page-header-left">
            <h1>Pengaturan ⚙️</h1>
            <p>Konfigurasi akun admin dan aplikasi PlaySKD</p>
          </div>
        </div>

        {/* Admin Profile Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <span className="card-header-title">👤 Profil Administrator</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <div className="user-avatar" style={{ width: '52px', height: '52px', fontSize: '20px' }}>
                {email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--gray-900)' }}>{email.split('@')[0]}</div>
                <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{email}</div>
                <div style={{ marginTop: '4px' }}><span className="badge badge-active">✅ Administrator</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <span className="card-header-title">🔐 Ubah Password</span>
          </div>
          <div className="card-body">
            {msgPass && (
              <div className={`alert alert-${msgPass.type}`}>
                <span className="alert-icon">{msgPass.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{msgPass.text}</span>
              </div>
            )}
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <input type="password" className="form-input" placeholder="Minimal 6 karakter" minLength={6} required
                  value={newPass} onChange={e => setNewPass(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Konfirmasi Password Baru</label>
                <input type="password" className="form-input" placeholder="Ulangi password baru" minLength={6} required
                  value={confirmPass} onChange={e => setConfirm(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingPass}>
                {savingPass ? '⏳ Menyimpan...' : '🔑 Ubah Password'}
              </button>
            </form>
          </div>
        </div>

        {/* App Settings */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <span className="card-header-title">📱 Pengaturan Aplikasi</span>
          </div>
          <div className="card-body">
            {msgApp && (
              <div className={`alert alert-${msgApp.type}`}>
                <span className="alert-icon">{msgApp.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{msgApp.text}</span>
              </div>
            )}
            <form onSubmit={handleSaveApp}>
              <div className="form-group">
                <label className="form-label">Nama Aplikasi</label>
                <input type="text" className="form-input" value={appName} onChange={e => setAppName(e.target.value)} />
                <div className="form-hint">Nama yang ditampilkan di aplikasi mobile</div>
              </div>
              <div className="form-group">
                <label className="form-label">Batas Soal Harian (Free User)</label>
                <input type="number" className="form-input" min="1" max="100" value={freeLimit}
                  onChange={e => setFreeLimit(e.target.value)} />
                <div className="form-hint">Jumlah soal yang bisa dikerjakan pengguna free per hari</div>
              </div>
              <div className="form-group">
                <label className="form-label">Mode Maintenance</label>
                <select className="form-input">
                  <option value="off">🟢 Nonaktif – Aplikasi berjalan normal</option>
                  <option value="on">🔴 Aktif – Aplikasi dalam perbaikan</option>
                </select>
                <div className="form-hint">Saat aktif, pengguna tidak bisa login ke aplikasi</div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingApp}>
                {savingApp ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan'}
              </button>
            </form>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ border: '2px solid var(--color-danger-light)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--color-danger-light)' }}>
            <span className="card-header-title" style={{ color: 'var(--color-danger)' }}>⚠️ Zona Bahaya</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--gray-800)', marginBottom: '4px' }}>Keluar dari Dashboard</div>
                <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Sesi admin akan dihentikan dan kamu akan diarahkan ke halaman login.</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>↩ Keluar</button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
