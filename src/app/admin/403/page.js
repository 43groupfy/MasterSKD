'use client'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'

export default function Forbidden() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '48px 40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚫</div>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
          Akses Ditolak
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
          Kamu tidak memiliki izin untuk mengakses halaman ini. Hanya administrator resmi PlaySKD yang diperbolehkan masuk.
        </p>
        <button
          onClick={handleLogout}
          style={{ width: '100%', padding: '13px 24px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 3px 0 #3730a3', fontFamily: 'inherit' }}
        >
          ↩ Kembali ke Login
        </button>
      </div>
    </div>
  )
}
