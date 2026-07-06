"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar({ showStats = false, streak = 0, totalExp = 0 }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/test")) return null;

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
        </div>
      </div>
    </nav>
  );
}
