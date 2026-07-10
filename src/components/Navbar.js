"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Navbar({ showStats = false, streak = 0, totalExp = 0 }) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState(null); // 'free' or 'premium'

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setIsLoggedIn(!!session);
      if (session?.user) {
        // Fetch membership status
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("premium, premium_until")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (profile) {
          const isActive = profile.premium && (!profile.premium_until || new Date(profile.premium_until) > new Date());
          setMembership(isActive ? 'premium' : 'free');
        } else {
          setMembership('free');
        }
      } else {
        setMembership(null);
      }
      setLoading(false);
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        // Re-fetch on auth change
        supabase
          .from("user_profiles")
          .select("premium, premium_until")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              const isActive = data.premium && (!data.premium_until || new Date(data.premium_until) > new Date());
              setMembership(isActive ? 'premium' : 'free');
            } else {
              setMembership('free');
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

  if (pathname?.startsWith("/test")) return null;
  const isPublicPage = pathname === "/" || pathname === "/login";

  // Tampilkan badge membership hanya jika user login dan bukan halaman publik
  const showMembershipBadge = !loading && isLoggedIn && !isPublicPage && membership;

  return (
    <nav className="navbar">
      <div className="container navbar__inner">
        <Link href="/" className="navbar__brand">
          <div className="navbar__logo">
            <span className="navbar__logo-text">SKD</span>
          </div>
          <span className="navbar__title">PlaySKD</span>
        </Link>

        <div className="navbar__nav">
          {/* Tampilkan badge membership */}
          {showMembershipBadge && (
            membership === 'premium' ? (
              <div
                className="streak-badge"
                style={{
                  color: "var(--yellow-dark)",
                  background: "var(--yellow-light)",
                  borderColor: "rgba(217,119,6,.25)",
                }}
              >
                <span>⭐</span>
                <span>PREMIUM</span>
              </div>
            ) : (
              <div
                className="streak-badge"
                style={{
                  color: "var(--gray-600)",
                  background: "var(--gray-100)",
                  borderColor: "var(--gray-200)",
                }}
              >
                <span>🆓</span>
                <span>FREE</span>
              </div>
            )
          )}

          {/* Link Profil & Premium */}
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
