'use client'

import { useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let data, authError
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      data = result.data
      authError = result.error
    } catch (err) {
      setError('Koneksi gagal. Periksa internet kamu.')
      setLoading(false)
      return
    }

    if (authError) {
      setError('Email atau password salah.')
      setLoading(false)
      return
    }

    if (!data?.user) {
      setError('Login gagal, coba lagi.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      await supabase.auth.signOut()
      setError('Akses ditolak. Akun ini bukan administrator.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">S</div>
          <div className="login-logo-text">
            <h1>PlaySKD</h1>
            <p>Admin Dashboard</p>
          </div>
        </div>

        <h2 className="login-title">Selamat Datang! 👋</h2>
        <p className="login-sub">Masuk untuk mengelola aplikasi PlaySKD</p>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Admin</label>
            <input
              type="email" required
              className="form-input"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--gray-400)', padding: '4px' }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="btn btn-primary btn-lg w-full"
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', marginRight: '8px' }}></span> Memverifikasi...</>
            ) : '🚀 Masuk Dashboard'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--gray-400)' }}>
          Hanya untuk administrator resmi PlaySKD
        </p>
      </div>
    </div>
  )
}