"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import {
  getPremiumStatus,
  requestPremiumUpgrade,
  FREE_QUESTION_LIMIT,
  FREE_CAT_TOTAL_ATTEMPTS,
} from "../../lib/premium";

export default function PremiumPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState({ isActive: false });
  const [premiumPackages, setPremiumPackages] = useState([]);
  const [addonPackages, setAddonPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const [statusRes, pkgRes, reqRes] = await Promise.all([
        getPremiumStatus(user.id),
        supabase.from("exam_packages").select("*").order("created_at"),
        supabase.from("premium_purchase_requests")
          .select("status")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .maybeSingle(),
      ]);

      setStatus(statusRes);
      const pkgs = pkgRes.data || [];
      setPremiumPackages(pkgs.filter((p) => p.tier === "premium"));
      setAddonPackages(pkgs.filter((p) => p.tier === "addon"));
      setRequested(!!reqRes.data);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleUpgrade = async () => {
    if (!user || requesting) return;
    setRequesting(true);
    try {
      const { error } = await requestPremiumUpgrade(user.id, "premium");
      if (error) throw error;
      setRequested(true);
    } catch (err) {
      alert("Gagal mengajukan upgrade: " + err.message);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return (
    <>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="anim-pulse" style={{ fontSize: "3rem" }}>⭐</div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <main className="page-main">
        <div className="container" style={{ maxWidth: "760px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "8px" }}>⭐</div>
            <h1 style={{ marginBottom: "8px" }}>Play-SKD Premium</h1>
            <p style={{ color: "var(--gray-500)" }}>
              Buka akses penuh terhadap seluruh bank soal & simulasi CAT — belajar tanpa batas.
            </p>
          </div>

          {status.isActive && (
            <div className="card" style={{ background: "var(--green-light)", border: "2px solid var(--green)", textAlign: "center", marginBottom: "24px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--green-dark)" }}>
                ✅ Kamu sudah Premium!
              </div>
              {status.premiumUntil && (
                <div style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginTop: "4px" }}>
                  Aktif hingga {new Date(status.premiumUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              )}
            </div>
          )}

          {/* Perbandingan FREE vs PREMIUM */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            <div className="card" style={{ padding: "24px" }}>
              <h3 style={{ marginBottom: "4px" }}>FREE</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--gray-500)", marginBottom: "16px" }}>Untuk mencoba pengalaman Play-SKD</p>
              <ul style={{ fontSize: "0.9rem", color: "var(--gray-700)", lineHeight: 2.2, paddingLeft: "18px" }}>
                <li>Maks. {FREE_QUESTION_LIMIT} soal total (lintas semua materi)</li>
                <li>2 Paket CAT gratis</li>
                <li>Maks. {FREE_CAT_TOTAL_ATTEMPTS} percobaan CAT total</li>
                <li>Progress, XP & statistik tetap tersimpan</li>
              </ul>
            </div>

            <div className="card" style={{ padding: "24px", border: "2px solid var(--yellow-dark)", background: "var(--yellow-light)" }}>
              <h3 style={{ marginBottom: "4px", color: "var(--yellow-dark)" }}>PREMIUM ⭐</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--gray-600)", marginBottom: "16px" }}>Akses penuh, tanpa batas</p>
              <ul style={{ fontSize: "0.9rem", color: "var(--gray-800)", lineHeight: 2.2, paddingLeft: "18px" }}>
                <li>Seluruh soal & materi terbuka</li>
                <li>Latihan unlimited, semua update soal otomatis</li>
                <li>Paket CAT Premium bawaan, unlimited attempt</li>
                <li>Semua fitur FREE tetap tersedia</li>
              </ul>
            </div>
          </div>

          {!status.isActive && (
            <div className="card" style={{ textAlign: "center", padding: "28px", marginBottom: "28px" }}>
              {requested ? (
                <>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⏳</div>
                  <h3 style={{ marginBottom: "6px" }}>Permintaan Sedang Diproses</h3>
                  <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>
                    Tim kami akan mengaktifkan Premium setelah pembayaran/permintaan kamu dikonfirmasi.
                  </p>
                </>
              ) : (
                <>
                  <button onClick={handleUpgrade} disabled={requesting} className="btn btn--yellow btn--lg">
                    {requesting ? "Memproses..." : "⭐ Upgrade ke Premium"}
                  </button>
                  <p style={{ color: "var(--gray-400)", fontSize: "0.78rem", marginTop: "10px" }}>
                    Tim kami akan menghubungimu untuk menyelesaikan pembayaran.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Paket CAT termasuk Premium */}
          {premiumPackages.length > 0 && (
            <>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: "12px" }}>Paket CAT Termasuk Premium</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "28px" }}>
                {premiumPackages.map((pkg) => (
                  <div key={pkg.id} className="card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem" }}>{pkg.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--gray-500)" }}>{pkg.total_questions} soal</div>
                    </div>
                    <span className="pill pill--green">Unlimited</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {addonPackages.length > 0 && (
            <>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: "12px" }}>Paket CAT Tambahan (Add-on)</h3>
              <p style={{ color: "var(--gray-500)", fontSize: "0.85rem", marginBottom: "12px" }}>
                Bisa dibeli terpisah tanpa berlangganan Premium.
              </p>
              <div style={{ marginBottom: "12px" }}>
                <a href="/packages" className="btn btn--ghost btn--sm">Lihat Paket Tryout →</a>
              </div>
            </>
          )}

          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <a href="/dashboard" style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>← Kembali ke Dashboard</a>
          </div>
        </div>
      </main>
    </>
  );
}
