"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { getPremiumStatus, FREE_QUESTION_LIMIT } from "../../lib/premium";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState(null);
  const [premiumStatus, setPremiumStatus] = useState({ isActive: false, premiumUntil: null });
  const [remainingQuota, setRemainingQuota] = useState(0);
  const [totalSeen, setTotalSeen] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
      setDisplayName(name);
      setNewDisplayName(name);

      // Premium status
      const status = await getPremiumStatus(user.id);
      setPremiumStatus(status);

      // Get total unique questions seen by user
      const { data: logs } = await supabase
        .from("quiz_logs")
        .select("question_id", { distinct: true })
        .eq("user_id", user.id);
      const seenCount = logs?.length || 0;
      setTotalSeen(seenCount);
      const remaining = Math.max(0, FREE_QUESTION_LIMIT_TOTAL - seenCount);
      setRemainingQuota(remaining);

      setLoading(false);
    };
    init();
  }, [router]);

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (newDisplayName.trim() === displayName) {
      setMessage("Nama tidak berubah.");
      return;
    }
    setIsUpdating(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: newDisplayName.trim() },
      });
      if (error) throw error;
      setDisplayName(newDisplayName.trim());
      setMessage("Nama berhasil diperbarui!");
    } catch (err) {
      setMessage("Gagal memperbarui nama: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="anim-pulse" style={{ fontSize: "3rem" }}>👤</div>
      </div>
    </>
  );

  const isPremium = premiumStatus.isActive;
  const premiumUntil = premiumStatus.premiumUntil;

  return (
    <>
      <Navbar />
      <main className="page-main">
        <div className="container" style={{ maxWidth: "480px" }}>
          <h1 style={{ marginBottom: "20px" }}>Profil Saya 👤</h1>

          <div className="card card--raised" style={{ padding: "32px" }}>
            {/* Display Name */}
            <form onSubmit={handleUpdateName} style={{ marginBottom: "24px" }}>
              <label className="input-label">Nama Tampilan</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="input"
                  placeholder="Nama kamu"
                  required
                />
                <button type="submit" disabled={isUpdating} className="btn btn--primary" style={{ flexShrink: 0 }}>
                  {isUpdating ? "..." : "Ubah"}
                </button>
              </div>
              {message && (
                <div style={{ marginTop: "8px", fontSize: "0.85rem", color: message.includes("berhasil") ? "var(--green)" : "var(--red)" }}>
                  {message}
                </div>
              )}
            </form>

            <div className="divider" />

            {/* Status Keanggotaan */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem", marginBottom: "8px" }}>
                Status Keanggotaan
              </div>
              {isPremium ? (
                <div style={{ background: "var(--green-light)", border: "2px solid var(--green)", borderRadius: "var(--radius-md)", padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.2rem" }}>⭐</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--green-dark)" }}>PREMIUM</span>
                  </div>
                  {premiumUntil && (
                    <div style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginTop: "4px" }}>
                      Aktif hingga {new Date(premiumUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: "var(--gray-100)", border: "2px solid var(--gray-200)", borderRadius: "var(--radius-md)", padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.2rem" }}>🆓</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--gray-700)" }}>FREE</span>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginTop: "4px" }}>
                    Sisa kuota: <strong>{remainingQuota}</strong> soal dari {FREE_QUESTION_LIMIT_TOTAL}
                    {totalSeen > 0 && <span style={{ fontSize: "0.75rem", color: "var(--gray-400)", marginLeft: "4px" }}>(sudah dikerjakan {totalSeen})</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Upgrade jika FREE */}
            {!isPremium && (
              <button onClick={() => router.push("/premium")} className="btn btn--yellow btn--block" style={{ marginBottom: "16px" }}>
                ⭐ Upgrade ke Premium
              </button>
            )}

            <div className="divider" />

            {/* Email */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem", marginBottom: "4px" }}>
                Email
              </div>
              <div style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>{user?.email}</div>
            </div>

            <div className="divider" />

            <button onClick={handleLogout} className="btn btn--ghost btn--block" style={{ color: "var(--red)" }}>
              Keluar dari Akun
            </button>
          </div>

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <a href="/dashboard" style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>← Kembali ke Dashboard</a>
          </div>
        </div>
      </main>
    </>
  );
}
