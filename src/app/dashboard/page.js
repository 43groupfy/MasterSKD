"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getLevelProgress } from "../../lib/exp";
import { formatDate } from "../../lib/utils";

const LABEL_INFO = {
  TWK: { code: "TWK", name: "Tes Wawasan Kebangsaan", emoji: "🇮🇩", color: "var(--blue)", bg: "var(--blue-light)", border: "var(--blue)", pill: "pill--blue" },
  TIU: { code: "TIU", name: "Tes Intelegensia Umum",  emoji: "🧠", color: "var(--purple-dark)", bg: "var(--purple-light)", border: "var(--purple-dark)", pill: "pill--purple" },
  TKP: { code: "TKP", name: "Tes Karakteristik Pribadi", emoji: "💼", color: "var(--green-dark)", bg: "var(--green-light)", border: "var(--green)", pill: "pill--green" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [levelData, setLevelData] = useState({ level: 1, totalExp: 0, expThisLevel: 0, expToNext: 100 });
  const [labelProgress, setLabelProgress] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk riwayat
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  // State baru untuk Accordion Materi
  const [expanded, setExpanded] = useState(null);
  const [subtopics, setSubtopics] = useState({});
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    const init = async () => {
      router.refresh(); 
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      // Fetch Data Paralel (Limit dinaikkan ke 6 untuk mendeteksi apakah ada lebih dari 5 riwayat)
      const [levelRes, progressRes, historyRes, subRes] = await Promise.all([
        supabase.from("user_level").select("*").eq("user_id", user.id).single(),
        supabase.from("user_progress").select("*").eq("user_id", user.id),
        supabase.from("exam_history").select("*, exam_packages(name)").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(6),
        supabase.from("daftar_subtopik").select("label, sub_label")
      ]);

      // 1. Map Daftar Subtopik
      const subs = {};
      subRes.data?.forEach(q => {
        if (!subs[q.label]) subs[q.label] = new Set();
        subs[q.label].add(q.sub_label);
      });
      const subsArr = {};
      Object.entries(subs).forEach(([label, set]) => { subsArr[label] = Array.from(set).sort(); });
      setSubtopics(subsArr);

      // 2. Kalkulasi Progress per Materi & Auto-Sync EXP
      let calculatedTotalExp = 0;
      const pm = {};
      const grouped = {};
      
      progressRes.data?.forEach(p => {
        pm[`${p.label}__${p.sub_label}`] = p.exp_points;
        calculatedTotalExp += p.exp_points;
        
        if (!grouped[p.label]) grouped[p.label] = { label: p.label, totalExp: 0 };
        grouped[p.label].totalExp += p.exp_points;
      });
      
      setProgressMap(pm);
      setLabelProgress(Object.values(grouped));

      // 3. Sinkronisasi Data Level
      const dbTotalExp = levelRes.data?.total_exp || 0;
      const finalTotalExp = Math.max(dbTotalExp, calculatedTotalExp);

      const progressCalc = getLevelProgress(finalTotalExp);
      setLevelData({ ...progressCalc, totalExp: finalTotalExp });

      // Background task: perbaiki data nyangkut jika ada
      if (calculatedTotalExp > dbTotalExp) {
        if (levelRes.data) {
          await supabase.from("user_level").update({ total_exp: calculatedTotalExp, level: progressCalc.level }).eq("user_id", user.id);
        } else {
          await supabase.from("user_level").insert({ user_id: user.id, total_exp: calculatedTotalExp, level: progressCalc.level });
        }
      }

      // Deteksi & set riwayat tryout
      if (historyRes.data) {
        if (historyRes.data.length > 5) {
          setHasMoreHistory(true);
          setExamHistory(historyRes.data.slice(0, 5)); // Tampilkan 5 saja di dashboard
        } else {
          setHasMoreHistory(false);
          setExamHistory(historyRes.data);
        }
      }
      
      setLoading(false);
    };
    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Pejuang CASN";

  if (loading) return (
    <>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }} className="anim-pulse">🦉</div>
          <p style={{ color: "var(--gray-500)" }}>Memuat dashboard...</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar showStats totalExp={levelData.totalExp} />
      <main className="page-main">
        <div className="container">
          
          {/* Greeting */}
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ marginBottom: "4px" }}>Halo, {displayName}! 👋</h1>
            <p style={{ color: "var(--gray-500)" }}>Ayo lanjutkan latihan hari ini!</p>
          </div>

          {/* XP Level Card */}
          <div className="card" style={{ background: "linear-gradient(135deg, var(--gray-900), #2d2d2d)", border: "none", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--yellow)", fontSize: "1rem" }}>
                  ⚡ Level {levelData.level}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--gray-400)", marginTop: "2px" }}>
                  {levelData.expThisLevel} / {levelData.expToNext || 100} XP
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--white)", fontSize: "0.9rem" }}>
                {levelData.totalExp} Total XP
              </div>
            </div>
            <div className="xp-bar-track" style={{ background: "rgba(255,255,255,.15)" }}>
              <div className="xp-bar-fill" style={{ width: `${Math.min((levelData.expThisLevel / (levelData.expToNext || 100)) * 100, 100)}%` }} />
            </div>
          </div>

          {/* CTA: Tryout Full Width */}
          <Link href="/packages" style={{ textDecoration: "none", display: "block", marginBottom: "32px" }}>
            <div className="card" style={{ 
              background: "linear-gradient(135deg, var(--green-light), #d4f8a6)", 
              borderColor: "var(--green)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              padding: "20px 24px",
              cursor: "pointer"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "1.6rem" }}>🎯</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--green-dark)", fontSize: "1.2rem" }}>Tryout SKD Mode</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Uji kemampuanmu dengan simulasi 110 soal · 100 menit</div>
              </div>
              <div className="btn btn--primary" style={{ pointerEvents: "none", flexShrink: 0, padding: "8px 20px" }}>
                Mulai →
              </div>
            </div>
          </Link>

          {/* Progress Materi (Accordion + Link Quiz) */}
          <h3 id="progress-materi" style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: "14px", scrollMarginTop: "80px" }}>Materi & Latihan Quiz</h3>          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", alignItems: "start", marginBottom: "32px" }}>
            {["TWK", "TIU", "TKP"].map(labelCode => {
              const info = LABEL_INFO[labelCode];
              const subs = subtopics[labelCode] || [];
              const isOpen = expanded === labelCode;
              
              const data = labelProgress.find(p => p.label === labelCode);
              const labelExp = data?.totalExp || 0;

              return (
                <div key={labelCode} className="card" style={{ padding: 0, overflow: "hidden", borderColor: isOpen ? info.border : "var(--gray-200)", transition: "border-color .2s" }}>
                  {/* Header Accordion */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : labelCode)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "18px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ width: "46px", height: "46px", borderRadius: "var(--radius-md)", background: info.bg, border: `2px solid ${info.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                      {info.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--gray-900)", marginBottom: "2px" }}>{labelCode}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>{info.name}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: info.color, fontSize: "0.9rem" }}>{labelExp} EXP</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", marginTop: "1px" }}>{subs.length} subtopik</div>
                    </div>
                    <div style={{ fontSize: "1rem", color: "var(--gray-400)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", marginLeft: "8px", flexShrink: 0 }}>▾</div>
                  </button>

                  {/* Bar Progress Mini */}
                  <div style={{ marginBottom: "16px", padding: "0px 20px" }}>
                    <div className="xp-bar-track" style={{ height: "8px" }}>
                      <div className="xp-bar-fill" style={{ width: `${Math.min((labelExp / 500) * 100, 100)}%`, background: info.color }} />
                    </div>
                  </div>

                  {/* Body Accordion dengan Efek Animasi */}
                  <div 
                    style={{ 
                      display: "grid", 
                      gridTemplateRows: isOpen ? "1fr" : "0fr", 
                      transition: "grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
                      opacity: isOpen ? 1 : 0,
                      visibility: isOpen ? "visible" : "hidden"
                    }}
                  >
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ borderTop: `2px solid ${info.bg}`, padding: "12px" }}>

                        {/* Semua Materi */}
                        <button
                          onClick={() => router.push(`/quiz/${labelCode}?sub=all`)}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: "var(--radius-md)", border: `2px solid ${info.border}`, background: info.bg, cursor: "pointer", marginBottom: "8px" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "1.1rem" }}>🎲</span>
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: info.color, fontSize: "0.9rem" }}>Latihan Semua Materi</span>
                          </div>
                          <span className={`pill ${info.pill}`} style={{ fontSize: "0.72rem" }}>Random</span>
                        </button>

                        {/* Subtopik */}
                        {subs.map(sub => {
                          const exp = progressMap[`${labelCode}__${sub}`] || 0;
                          return (
                            <button
                              key={sub}
                              onClick={() => router.push(`/quiz/${labelCode}?sub=${encodeURIComponent(sub)}`)}
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "2px solid var(--gray-200)", background: "var(--white)", cursor: "pointer", marginBottom: "6px", textAlign: "left" }}
                            >
                              <span style={{ fontSize: "0.9rem", color: "var(--gray-800)", fontWeight: 500 }}>{sub}</span>
                              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.78rem", color: "var(--gray-500)", flexShrink: 0 }}>
                                {exp > 0 ? <span style={{ color: info.color }}>⚡{exp} EXP</span> : "Belum dimulai"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exam History */}
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, marginBottom: "14px" }}>Riwayat Tryout</h3>
          {examHistory.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px", borderStyle: "dashed" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📝</div>
              <h4 style={{ marginBottom: "8px", color: "var(--gray-700)" }}>Belum Ada Riwayat</h4>
              <p style={{ color: "var(--gray-500)", fontSize: "0.9rem", marginBottom: "20px" }}>Selesaikan tryout pertamamu!</p>
              <Link href="/packages" className="btn btn--primary btn--sm">Pilih Paket Tryout →</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {examHistory.map(h => {
                const isPassing = h.score_total >= 311;
                return (
                  <Link key={h.id} href={`/result?session_id=${h.session_id}`} style={{ textDecoration: "none" }}>
                    <div className="card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", marginBottom: "3px" }}>
                          {h.exam_packages?.name || "Tryout SKD"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--gray-500)" }}>{formatDate(h.completed_at)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.2rem", color: isPassing ? "var(--green)" : "var(--yellow-dark)" }}>
                          {h.score_total}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>poin</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
              
              {/* Tombol Lihat Selengkapnya */}
              {hasMoreHistory && (
                <Link href="/history" className="btn btn--ghost" style={{ marginTop: "8px", width: "100%", display: "block", textAlign: "center" }}>
                  Lihat Selengkapnya →
                </Link>
              )}
            </div>
          )}

          <div style={{ marginTop: "40px", textAlign: "center" }}>
            <button onClick={handleLogout} className="btn btn--ghost btn--sm" style={{ color: "var(--gray-500)" }}>
              Keluar dari Akun
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
