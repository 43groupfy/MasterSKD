"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase"; // Sesuaikan path ini dengan struktur foldermu
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar"; // Sesuaikan path ini
import { formatDate } from "../../lib/utils"; // Sesuaikan path ini

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      // Ambil seluruh riwayat tanpa limit
      const { data, error } = await supabase
        .from("exam_history")
        .select("*, exam_packages(name)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (data) setExamHistory(data);
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) return (
    <>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="anim-pulse" style={{ fontSize: "3rem" }}>📝</div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <main className="page-main">
        <div className="container" style={{ maxWidth: "680px" }}>
          
          <div style={{ marginBottom: "28px" }}>
            <Link href="/dashboard" style={{ display: "inline-block", color: "var(--gray-500)", textDecoration: "none", fontSize: "0.9rem", marginBottom: "12px", fontWeight: 500 }}>
              ← Kembali ke Dashboard
            </Link>
            <h1 style={{ marginBottom: "4px" }}>Riwayat Tryout 📝</h1>
            <p style={{ color: "var(--gray-500)" }}>Seluruh rekam jejak simulasi ujianmu.</p>
          </div>

          {examHistory.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px", borderStyle: "dashed" }}>
              <h4 style={{ marginBottom: "8px", color: "var(--gray-700)" }}>Belum Ada Riwayat</h4>
              <p style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>Selesaikan tryout pertamamu agar muncul di sini!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {examHistory.map(h => {
                const isPassing = h.score_total >= 311; // Sesuaikan batas lulus (passing grade) jika berbeda
                return (
                  <Link key={h.id} href={`/result?session_id=${h.session_id}`} style={{ textDecoration: "none" }}>
                    <div className="card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "transform 0.2s", ":hover": { transform: "translateY(-2px)" } }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", marginBottom: "4px", color: "var(--gray-900)" }}>
                          {h.exam_packages?.name || "Tryout SKD"}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "var(--gray-500)" }}>{formatDate(h.completed_at)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.3rem", color: isPassing ? "var(--green)" : "var(--yellow-dark)" }}>
                          {h.score_total}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 500 }}>poin</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </>
  );
}
