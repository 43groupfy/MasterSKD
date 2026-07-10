"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import UpgradeModal from "../../components/UpgradeModal";
import {
  getCatAccess,
  canStartPackage,
  incrementCatAttempt,
  requestPackagePurchase,
  FREE_CAT_TOTAL_ATTEMPTS,
} from "../../lib/premium";

export default function PackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [upgradeReason, setUpgradeReason] = useState(null);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const [pkgRes, accessData] = await Promise.all([
        supabase.from("exam_packages").select("*").order("created_at"),
        getCatAccess(user.id),
      ]);
      setPackages(pkgRes.data || []);
      setAccess(accessData);
      setLoading(false);
    };
    init();
  }, []);

  const handleStart = async (pkg) => {
    if (starting || !user || !access) return;

    const check = canStartPackage(pkg, access);
    if (!check.allowed) {
      setUpgradeReason(
        check.reason === "free_quota" ? "cat_quota" :
        check.reason === "locked_premium" ? "cat_locked" : "cat_locked"
      );
      return;
    }

    setStarting(pkg.id);
    try {
      // Cek apakah ada session ongoing untuk package ini
      const { data: existing } = await supabase
        .from("exam_sessions")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("package_id", pkg.id)
        .eq("status", "ongoing")
        .maybeSingle();

      let sessionId;
      if (existing) {
        // Lanjutkan session yang sudah ada
        sessionId = existing.id;
      } else {
        // Buat session baru
        const { data: newSession, error } = await supabase
          .from("exam_sessions")
          .insert({ user_id: user.id, package_id: pkg.id, start_time: new Date().toISOString(), status: "ongoing" })
          .select()
          .single();
        if (error) throw error;
        sessionId = newSession.id;

        // Hitung percobaan hanya untuk paket FREE tier (kuota total 5x)
        if (pkg.tier === "free" && !access.isActive) {
          await incrementCatAttempt(user.id, pkg.id);
        }
      }
      router.push(`/test?session_id=${sessionId}`);
    } catch (err) {
      alert("Gagal memulai ujian: " + err.message);
      setStarting(null);
    }
  };

  const handleBuy = async (pkg) => {
    if (buying || !user) return;
    setBuying(pkg.id);
    try {
      const { error } = await requestPackagePurchase(user.id, pkg.id);
      if (error) throw error;
      alert("Permintaan pembelian diajukan. Paket akan aktif setelah pembayaran dikonfirmasi.");
    } catch (err) {
      alert("Gagal mengajukan pembelian: " + err.message);
    } finally {
      setBuying(null);
    }
  };

  if (loading) return (
    <>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="anim-pulse" style={{ fontSize: "3rem", textAlign: "center" }}>📦</div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <main className="page-main">
        <div className="container" style={{ maxWidth: "760px" }}>
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ marginBottom: "8px" }}>Pilih Paket Tryout 🎯</h1>
            <p style={{ color: "var(--gray-500)" }}>Pilih paket ujian SKD yang ingin kamu kerjakan</p>
          </div>

          {!access?.isActive && (
            <div className="card" style={{ background: "var(--blue-light)", border: "2px solid var(--blue)", marginBottom: "24px", fontSize: "0.85rem", color: "var(--gray-700)" }}>
              Kamu di paket <strong>FREE</strong>: {access?.totalFreeAttempts ?? 0}/{FREE_CAT_TOTAL_ATTEMPTS} percobaan CAT gratis terpakai.
            </div>
          )}

          {packages.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📭</div>
              <h3>Belum Ada Paket Ujian</h3>
              <p style={{ color: "var(--gray-500)", marginTop: "8px" }}>Admin belum menambahkan paket ujian.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {packages.map((pkg, i) => {
                const check = access ? canStartPackage(pkg, access) : { allowed: false };
                const owned = access?.purchasedIds?.has(pkg.id);
                const tierBadge = pkg.tier === "free"
                  ? <span className="pill pill--blue">Gratis</span>
                  : pkg.tier === "premium"
                  ? <span className="pill" style={{ background: "var(--yellow-dark)", color: "var(--white)" }}>⭐ Premium</span>
                  : <span className="pill" style={{ background: "var(--gray-700)", color: "var(--white)" }}>Add-on{pkg.price ? ` · Rp${pkg.price.toLocaleString("id-ID")}` : ""}</span>;

                return (
                  <div key={pkg.id} className="card card--hover" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-md)", background: "var(--green-light)", border: "2px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--green-dark)", fontSize: "1rem", flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div>
                          <h3 style={{ marginBottom: "2px" }}>{pkg.name}</h3>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <span className="pill pill--green">{pkg.total_questions} soal</span>
                            <span className="pill pill--blue">100 menit</span>
                            {tierBadge}
                            {pkg.tier === "addon" && owned && <span className="pill" style={{ background: "var(--green)", color: "var(--white)" }}>✓ Dimiliki</span>}
                          </div>
                        </div>
                      </div>
                      {pkg.description && (
                        <p style={{ fontSize: "0.9rem", color: "var(--gray-500)", marginLeft: "56px" }}>{pkg.description}</p>
                      )}
                    </div>

                    {check.allowed ? (
                      <button
                        onClick={() => handleStart(pkg)}
                        disabled={!!starting}
                        className="btn btn--primary"
                        style={{ flexShrink: 0 }}
                      >
                        {starting === pkg.id ? "Memulai..." : "Mulai Ujian →"}
                      </button>
                    ) : check.reason === "not_purchased" ? (
                      <button
                        onClick={() => handleBuy(pkg)}
                        disabled={!!buying}
                        className="btn btn--yellow"
                        style={{ flexShrink: 0 }}
                      >
                        {buying === pkg.id ? "Memproses..." : `🔓 Beli Paket`}
                      </button>
                    ) : (
                      <button
                        onClick={() => setUpgradeReason(check.reason === "free_quota" ? "cat_quota" : "cat_locked")}
                        className="btn"
                        style={{ flexShrink: 0, background: "var(--gray-100)", border: "2px solid var(--gray-200)", color: "var(--gray-500)" }}
                      >
                        🔒 Terkunci
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: "32px", textAlign: "center" }}>
            <a href="/dashboard" style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>← Kembali ke Dashboard</a>
          </div>
        </div>
      </main>
      <UpgradeModal open={!!upgradeReason} onClose={() => setUpgradeReason(null)} reason={upgradeReason || "cat_quota"} />
    </>
  );
}
