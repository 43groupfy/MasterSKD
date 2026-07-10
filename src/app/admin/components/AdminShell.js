'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../utils/supabase'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/questions', icon: '📚', label: 'Bank Soal' },
  { href: '/packages', icon: '📦', label: 'Paket Soal' },
  { href: '/users', icon: '👥', label: 'Kelola Pengguna' },
  { href: '/analytics', icon: '📈', label: 'Analitik' },
  { href: '/settings', icon: '⚙️', label: 'Pengaturan' },
]

export default function AdminShell({ children, title, subtitle }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminEmail, setAdminEmail] = useState('Admin')

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        setAdminEmail(data.user.email)
      }
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = adminEmail.charAt(0).toUpperCase()
  const displayName = adminEmail.split('@')[0]

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">S</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">PlaySKD</span>
            <span className="sidebar-brand-sub">Admin Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Menu</div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <button
                key={item.href}
                className={`nav-link${isActive ? ' active' : ''}`}
                onClick={() => router.push(item.href)}
              >
                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Admin Profile */}
        <div className="sidebar-bottom">
          <div className="sidebar-admin-card">
            <div className="admin-avatar">{initials}</div>
            <div className="admin-info">
              <div className="admin-name">{displayName}</div>
              <div className="admin-role">Administrator</div>
            </div>
            <button className="btn-logout" onClick={handleLogout} title="Keluar">
              ↩
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-title">
            {title}
            {subtitle && <span className="topbar-subtitle">/ {subtitle}</span>}
          </div>
          <div className="topbar-actions">
            <div style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}