"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Navbar({ showStats = false, streak = 0, totalExp = 0 }) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      setLoading(false);
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Sembunyikan navbar di halaman test
  if (pathname?.startsWith("/test")) return null;

  // Tentukan halaman publik: tidak boleh menampilkan link Profil & Premium
  const isPublicPage = pathname === "/" || pathname === "/login";

  return (
    <nav className="navbar">
      <div className="container navbar__inner">
        {/* Brand */}
        <Link href="/" className="navbar__brand">
          <div className="navbar__logo">
            <span className="navbar__logo-text">SKD</span>
          </div>
          <span className="navbar__title">PlaySKD</span>
        </Link>

        {/* Right side */}
        <div className="navbar__nav">
          {showStats && (
            <>
              <div className="streak-badge">
                <span>🔥</span>
                <span>{streak}</span>
              </div>
              <div
                className="streak-badge"
                style={{
                  color: "var(--purple-dark)",
                  background: "var(--purple-light)",
                  borderColor: "rgba(168,85,247,.2)",
                }}
              >
                <span>⚡</span>
                <span>{totalExp} XP</span>
              </div>
            </>
          )}

          {/* Link Profil & Premium — hanya jika user login DAN bukan halaman publik */}
          {!loading && isLoggedIn && !isPublicPage && (
            <>
              <Link
                href="/profile"
                className="streak-badge"
                style={{
                  color: "var(--blue-dark)",
                  background: "var(--blue-light)",
                  borderColor: "rgba(28,176,246,.2)",
                  textDecoration: "none",
                }}
              >
                <span>👤</span>
                <span className="hide-mobile">Profil</span>
              </Link>

              <Link
                href="/premium"
                className="streak-badge"
                style={{
                  color: "var(--yellow-dark)",
                  background: "var(--yellow-light)",
                  borderColor: "rgba(217,119,6,.25)",
                  textDecoration: "none",
                }}
              >
                <span>⭐</span>
                <span className="hide-mobile">Premium</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
