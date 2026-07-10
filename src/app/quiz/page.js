"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import UpgradeModal from "../../components/UpgradeModal";
import { getLevelProgress } from "../../lib/exp";
import {
  getPremiumStatus,
  getAllSeenQuestionIds,
  materiUsageCount,
  FREE_QUESTION_LIMIT,
} from "../../lib/premium";

const LABELS = [
  { code: "TWK", name: "Tes Wawasan Kebangsaan", emoji: "🇮🇩", color: "var(--blue)", bg: "var(--blue-light)", border: "var(--blue)", pill: "pill--blue" },
  { code: "TIU", name: "Tes Intelegensia Umum",  emoji: "🧠", color: "var(--purple-dark)", bg: "var(--purple-light)", border: "var(--purple-dark)", pill: "pill--purple" },
  { code: "TKP", name: "Tes Karakteristik Pribadi", emoji: "💼", color: "var(--green-dark)", bg: "var(--green-light)", border: "var(--green)", pill: "pill--green" },
];

export default function QuizPage() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(null);
  const [subtopics, setSubtopics] = useState({});
  const [progress, setProgress] = useState({});
  const [levelData, setLevelData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [seenMap, setSeenMap] = useState({});
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const init = async () => {
      router.refresh(); // ⚡ Paksa Next.js mengambil state terbaru
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      
      // Load subtopics per label
      const { data: qs } = await supabase.from("daftar_subtopik").select("label, sub_label");
      const subs = {};
      qs?.forEach(q => {
        if (!subs[q.label]) subs[q.label] = new Set();
        subs[q.label].add(q.sub_label);
      });
      const subsArr = {};
      Object.entries(subs).forEach(([label, set]) => { subsArr[label] = Array.from(set).sort(); });
      setSubtopics(subsArr);

      // Load user progress
      const [progressRes, levelRes, premiumStatus, seen] = await Promise.all([
        supabase.from("user_progress").select("*").eq("user_id", user.id),
        supabase.from("user_level").select("*").eq("user_id", user.id).single(),
        getPremiumStatus(user.id),
        getAllSeenQuestionIds(user.id),
      ]);
      setIsPremium(premiumStatus.isActive);
      setSeenMap(seen);
      
      let calculatedTotalExp = 0;
      const pm = {};
      progressRes.data?.forEach(p => { 
        pm[`${p.label}__${p.sub_label}`] = p.exp_points; 
        calculatedTotalExp += p.exp_points; // Hitung manual total dari subtopik
      });
      setProgress(pm);

      // Sinkronisasi Data: Jika EXP manual > EXP yang ada di user_level, gunakan EXP manual
      const dbTotalExp = levelRes.data?.total_exp || 0;
      const finalTotalExp = Math.max(dbTotalExp, calculatedTotalExp);

      const progressCalc = getLevelProgress(finalTotalExp);
      setLevelData({ ...progressCalc, totalExp: finalTotalExp });

      // Perbaiki data yang nyangkut di database secara diam-diam (background task)
      if (calculatedTotalExp > dbTotalExp) {
        if (levelRes.data) {
          await supabase.from("user_level").update({ total_exp: calculatedTotalExp, level: progressCalc.level }).eq("user_id", user.id);
        } else {
          await supabase.from("user_level").insert({ user_id: user.id, total_exp: calculatedTotalExp, level: progressCalc.level });
        }
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const goQuiz = (label, sub) => {
    if (!isPremium && sub !== "all" && materiUsageCount(seenMap, label, sub) >= FREE_QUESTION_LIMIT) {
      setShowUpgrade(true);
      return;
    }
    router.push(`/quiz/${label}?sub=${encodeURIComponent(sub)}`);
  };

  if (loading) return (
    <>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="anim-pulse" style={{ fontSize: "3rem" }}>⚡</div>
      </div>
    </>
  );

  return (
    <>
      {/* PERBAIKAN: Melempar totalExp akurat */}
      <Navbar showStats totalExp={levelData?.totalExp || 0} />
      <main className="page-main">
        <div className="container" style={{ maxWidth: "680px" }}>
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ marginBottom: "6px" }}>Mode Quiz ⚡</h1>
            <p style={{ color: "var(--gray-500)" }}>Pilih materi untuk berlatih dan kumpulkan EXP!</p>
          </div>

          {/* Level card */}
          {levelData && (
            <div className="card" style={{ background: "linear-gradient(135deg, var(--gray-900), #2d2d2d)", border: "none", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--yellow)", fontSize: "0.95rem" }}>
                  ⚡ Level {levelData.level}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--gray-400)" }}>
                  {levelData.expThisLevel} / {levelData.expToNext || 100} XP
                </div>
              </div>
              <div className="xp-bar-track" style={{ background: "rgba(255,255,255,.15)" }}>
                <div 
                  className="xp-bar-fill" 
                  style={{ width: `${Math.min((levelData.expThisLevel / (levelData.expToNext || 100)) * 100, 100)}%` }} 
                />
              </div>
            </div>
          )}

          {/* Label accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {LABELS.map(label => {
              const subs = subtopics[label.code] || [];
              const isOpen = expanded === label.code;
              const labelExp = subs.reduce((sum, s) => sum + (progress[`${label.code}__${s}`] || 0), 0);

              return (
                <div key={label.code} className="card" style={{ padding: 0, overflow: "hidden", borderColor: isOpen ? label.border : "var(--gray-200)", transition: "border-color .2s" }}>
                  {/* Header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : label.code)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "18px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ width: "46px", height: "46px", borderRadius: "var(--radius-md)", background: label.bg, border: `2px solid ${label.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                      {label.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--gray-900)", marginBottom: "2px" }}>{label.code}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-500)" }}>{label.name}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: label.color, fontSize: "0.9rem" }}>{labelExp} EXP</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", marginTop: "1px" }}>{subs.length} subtopik</div>
                    </div>
                    <div style={{ fontSize: "1rem", color: "var(--gray-400)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", marginLeft: "8px", flexShrink: 0 }}>▾</div>
                  </button>

                  {/* Subtopics */}
                  {isOpen && (
                    <div style={{ borderTop: `2px solid ${label.bg}`, padding: "8px 12px 12px" }}>
                      {/* Semua Materi */}
                      <button
                        onClick={() => goQuiz(label.code, "all")}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "var(--radius-md)", border: `2px solid ${label.border}`, background: label.bg, cursor: "pointer", marginBottom: "6px" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1rem" }}>🎲</span>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: label.color, fontSize: "0.9rem" }}>Semua Materi</span>
                        </div>
                        <span className={`pill ${label.pill}`} style={{ fontSize: "0.72rem" }}>Random</span>
                      </button>

                      {subs.map(sub => {
                        const exp = progress[`${label.code}__${sub}`] || 0;
                        const usedCount = materiUsageCount(seenMap, label.code, sub);
                        const isLocked = !isPremium && usedCount >= FREE_QUESTION_LIMIT;
                        return (
                          <button
                            key={sub}
                            onClick={() => goQuiz(label.code, sub)}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "var(--radius-md)", border: isLocked ? "2px solid var(--yellow-dark)" : "2px solid var(--gray-200)", background: isLocked ? "var(--yellow-light)" : "var(--white)", cursor: "pointer", marginBottom: "4px", textAlign: "left" }}
                          >
                            <span style={{ fontSize: "0.9rem", color: "var(--gray-800)", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                              {sub}
                              {isLocked && <span className="pill" style={{ background: "var(--yellow-dark)", color: "var(--white)", fontSize: "0.65rem" }}>🔒 Premium</span>}
                            </span>
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.78rem", color: "var(--gray-500)", flexShrink: 0 }}>
                              {isPremium
                                ? (exp > 0 ? <span style={{ color: label.color }}>⚡{exp} EXP</span> : "Belum dimulai")
                                : <span style={{ color: isLocked ? "var(--yellow-dark)" : "var(--gray-500)" }}>{usedCount}/{FREE_QUESTION_LIMIT} soal</span>
                              }
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "32px", textAlign: "center" }}>
            <a href="/dashboard" style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}>← Kembali ke Dashboard</a>
          </div>
        </div>
      </main>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="materi" />
    </>
  );
}
