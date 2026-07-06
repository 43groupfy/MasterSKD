"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

export default function PackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data } = await supabase
        .from("exam_packages")
        .select("*")
        .order("created_at");
      setPackages(data || []);
      setLoading(false);
    };
    init();
  }, []);

  const handleStart = async (packageId) => {
    if (starting || !user) return;
    setStarting(packageId);
    try {
      // Cek apakah ada session ongoing untuk package ini
      const { data: existing } = await supabase
        .from("exam_sessions")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("package_id", packageId)
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
          .insert({ user_id: user.id, package_id: packageId, start_time: new Date().toISOString(), status: "ongoing" })
          .select()
          .single();
        if (error) throw error;
        sessionId = newSession.id;
      }
      router.push(`/test?session_id=${sessionId}`);
    } catch (err) {
      alert("Gagal memulai ujian: " + err.message);
      setStarting(null);
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

          {packages.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "60px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📭</div>
              <h3>Belum Ada Paket Ujian</h3>
              <p style={{ color: "var(--gray-500)", marginTop: "8px" }}>Admin belum menambahkan paket ujian.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {packages.map((pkg, i) => (
                <div key={pkg.id} className="card card--hover" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "var(--radius-md)", background: "var(--green-light)", border: "2px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--green-dark)", fontSize: "1rem", flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div>
                        <h3 style={{ marginBottom: "2px" }}>{pkg.name}</h3>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <span className="pill pill--green">{pkg.total_questions} soal</span>
                          <span className="pill pill--blue">100 menit</span>
                        </div>
                      </div>
                    </div>
                    {pkg.description && (
                      <p style={{ fontSize: "0.9rem", color: "var(--gray-500)", marginLeft: "56px" }}>{pkg.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStart(pkg.id)}
                    disabled={!!starting}
                    className="btn btn--primary"
                    style={{ flexShrink: 0 }}
                  >
                    {starting === pkg.id ? "Memulai..." : "Mulai Ujian →"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: "32px", textAlign: "center" }}>
            <a href="/dashboard" style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>← Kembali ke Dashboard</a>
          </div>
        </div>
      </main>
    </>
  );
}
