"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Navbar({ showStats = false, streak = 0, totalExp = 0 }) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState(null); // 'free' | 'premium' | null

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setIsLoggedIn(!!session);

      if (session?.user) {
        // Ambil status premium dari user_profiles
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("premium, premium_until")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profile) {
          const isActive = profile.premium && (!profile.premium_until || new Date(profile.premium_until) > new Date());
          setMembership(isActive ? "premium" : "free");
        } else {
          setMembership("free");
        }
      } else {
        setMembership(null);
      }
      setLoading(false);
    };

    checkSession();

    // Dengarkan perubahan auth (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        supabase
          .from("user_profiles")
          .select("premium, premium_until")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              const isActive = data.premium && (!data.premium_until || new Date(data.premium_until) > new Date());
              setMembership(isActive ? "premium" : "free");
            } else {
              setMembership("free");
            }
          });
      } else {
        setMembership(null);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Sembunyikan navbar di halaman test
  if (pathname?.startsWith("/test")) return null;

  const isPublicPage = pathname === "/" || pathname === "/login";
  const showMembershipBadge = !loading && isLoggedIn && !isPublicPage && membership;

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
          {/* Opsional: tampilkan streak & XP jika diperlukan (masih dikomentari) */}
          {/*
          {showStats && (
            <>
              <div className="streak-badge">
                <span>🔥</span>
                <span>{streak}</span>
              </div>
              <div className="streak-badge" style={{ color: "var(--purple-dark)", background: "var(--purple-light)", borderColor: "rgba(168,85,247,.2)" }}>
                <span>⚡</span>
                <span>{totalExp} XP</span>
              </div>
            </>
          )}
          */}

          {/* Link ke Profil (hanya untuk user login & bukan halaman publik) */}
          {!loading && isLoggedIn && !isPublicPage && (
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
          )}

          {/* Badge Membership sebagai LINK ke /premium */}
          {showMembershipBadge && (
            <Link
              href="/premium"
              className="streak-badge"
              style={{
                color: membership === "premium" ? "var(--yellow-dark)" : "var(--gray-600)",
                background: membership === "premium" ? "var(--yellow-light)" : "var(--gray-100)",
                borderColor: membership === "premium" ? "rgba(217,119,6,.25)" : "var(--gray-200)",
                textDecoration: "none",
              }}
            >
              <span>{membership === "premium" ? "⭐" : "🆓"}</span>
              <span>{membership === "premium" ? "PREMIUM" : "FREE"}</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
