import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { user } } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname

  // Jika tidak login dan mencoba akses dashboard atau admin, redirect ke login masing-masing
  if (!user) {
    if (path.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    if (path === '/dashboard' || path.startsWith('/profile') || path.startsWith('/quiz') || path.startsWith('/packages') || path.startsWith('/result') || path.startsWith('/history')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  // Jika login, cek role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Jika admin mengakses route user (bukan /admin), redirect ke /admin/dashboard
  if (isAdmin && !path.startsWith('/admin') && path !== '/admin/login' && path !== '/admin/forbidden') {
    // kecuali untuk halaman publik seperti /, /login, dll
    if (path !== '/' && path !== '/login' && !path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }
  }

  // Jika non-admin mengakses route admin, redirect ke /dashboard
  if (!isAdmin && path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/dashboard',
    '/profile/:path*',
    '/quiz/:path*',
    '/packages/:path*',
    '/result/:path*',
    '/history/:path*',
    '/admin/:path*',
    '/premium',
  ],
}
