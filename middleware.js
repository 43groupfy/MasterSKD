// middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { user } } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname

  // Daftar path publik yang tidak perlu autentikasi
  const publicPaths = ['/', '/login', '/admin/login', '/admin/forbidden']
  const isPublic = publicPaths.includes(path) || path.startsWith('/api')

  // ─── 1. BELUM LOGIN ──────────────────────────────────
  if (!user) {
    // Admin routes (kecuali login/forbidden) → redirect ke admin login
    if (path.startsWith('/admin') && !path.startsWith('/admin/login') && !path.startsWith('/admin/forbidden')) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    // User protected routes → redirect ke login user
    const userProtected = [
      '/dashboard',
      '/profile',
      '/quiz',
      '/packages',
      '/result',
      '/history',
      '/premium',
    ]
    if (userProtected.some(route => path === route || path.startsWith(route + '/'))) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Public paths: biarkan
    return res
  }

  // ─── 2. LOGIN, CEK ROLE ────────────────────────────
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // ─── 3. ADMIN ────────────────────────────────────────
  if (isAdmin) {
    // Root → admin dashboard
    if (path === '/') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }

    // Jika admin mengakses route user (bukan admin, bukan API, bukan public)
    if (
      !path.startsWith('/admin') &&
      !path.startsWith('/api') &&
      path !== '/login' &&
      path !== '/admin/login' &&
      path !== '/admin/forbidden'
    ) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }

    // Biarkan akses ke /admin/* dan public paths
    return res
  }

  // ─── 4. USER BIASA ──────────────────────────────────
  // Jika user mengakses admin → redirect ke dashboard user
  if (path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Root → dashboard user
  if (path === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Biarkan akses ke user routes
  return res
}

// ─── 5. KONFIGURASI MATCHER ──────────────────────────
export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/profile/:path*',
    '/quiz/:path*',
    '/packages/:path*',
    '/result/:path*',
    '/history/:path*',
    '/premium',
    '/admin/:path*',
  ],
}
