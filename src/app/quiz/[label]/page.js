"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { calculateQuizEXP, getLevelProgress } from "../../../lib/exp";
import { parseOptions, getMaxValue, isAnswerCorrect } from "../../../lib/scoring";
import { OPTION_LABELS, LABEL_STYLE } from "../../../lib/utils";
import QuizFeedback from "../../../components/QuizFeedback";

const QUIZ_COUNT = 10;

function QuizContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const label = params.label?.toUpperCase();
  const subParam = searchParams.get("sub") || "all";
  const subLabel = subParam === "all" ? "Semua Materi" : subParam;

  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [phase, setPhase] = useState("question"); // question | feedback | summary
  
  // Streak kini berupa Object untuk memisahkan progress per sub_label
  const [streaks, setStreaks] = useState({}); 
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Exit Confirmation
  const [showExitPopup, setShowExitPopup] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      // Load random questions
      let query = supabase.from("questions").select("*").eq("label", label);
      if (subParam !== "all") query = query.eq("sub_label", subParam);
      const { data } = await query;
      if (!data || data.length === 0) { setLoading(false); return; }

      const shuffled = data.sort(() => Math.random() - 0.5).slice(0, QUIZ_COUNT);
      const parsed = shuffled.map(q => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []),
      }));
      setQuestions(parsed);
      setLoading(false);
    };
    init();
  }, [label, subParam]);

  const handleConfirmAnswer = async () => {
    if (selectedIndex === null || !user) return;
    const q = questions[currentIndex];
    
    // Gunakan fungsi pengecekan scoring
    const correct = isAnswerCorrect(q, selectedIndex);
    
    // Ambil streak khusus untuk sub_label soal saat ini
    const currentSubLabelStreak = streaks[q.sub_label] || 0;
    
    // Kalkulasi EXP sesuai aturan baru
    const { exp, streakBonus, newStreak } = calculateQuizEXP(q, selectedIndex, currentSubLabelStreak, correct);

    // Update state streak spesifik untuk sub_label ini saja
    setStreaks(prev => ({ ...prev, [q.sub_label]: newStreak }));

    // Simpan ke quiz_logs
    await supabase.from("quiz_logs").insert({
      user_id: user.id,
      label: q.label,
      sub_label: q.sub_label,
      question_id: q.id,
      is_correct: correct,
      exp_gained: exp,
      streak_bonus: streakBonus,
    });

    // 2. Update user_progress (Bebas error Duplicate Upsert)
    const { data: existingProgress } = await supabase
      .from("user_progress")
      .select("exp_points")
      .eq("user_id", user.id)
      .eq("label", q.label)
      .eq("sub_label", q.sub_label)
      .maybeSingle();

    const newExp = Math.max(0, (existingProgress?.exp_points || 0) + exp);

    if (existingProgress) {
      await supabase.from("user_progress")
        .update({ exp_points: newExp })
        .eq("user_id", user.id)
        .eq("label", q.label)
        .eq("sub_label", q.sub_label);
    } else {
      await supabase.from("user_progress").insert({ user_id: user.id, label: q.label, sub_label: q.sub_label, exp_points: newExp });
    }

    // 3. Update user_level
    const { data: existingLevel } = await supabase
      .from("user_level")
      .select("total_exp")
      .eq("user_id", user.id)
      .maybeSingle();

    const newTotalExp = Math.max(0, (existingLevel?.total_exp || 0) + exp);
    const { level } = getLevelProgress(newTotalExp);

    if (existingLevel) {
      await supabase.from("user_level")
        .update({ total_exp: newTotalExp, level })
        .eq("user_id", user.id);
    } else {
      await supabase.from("user_level").insert({ user_id: user.id, total_exp: newTotalExp, level });
    }

    setResults(prev => [...prev, { questionId: q.id, selectedIndex, isCorrect: correct, expGained: exp, streakBonus }]);
    setPhase("feedback");
  };

  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      setPhase("summary");
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedIndex(null);
      setPhase("question");
    }
  };

  // 1. Fungsi untuk menampilkan popup (dipanggil saat tombol keluar diklik di tengah kuis)
  const handleExitClick = () => {
    setShowExitPopup(true);
  };

  // 2. Fungsi untuk menutup popup (Batal)
  const cancelExit = () => {
    setShowExitPopup(false);
  };

  // 3. Fungsi eksekusi keluar aslinya (menuju Dashboard)
  const confirmExit = () => {
    setShowExitPopup(false);
    router.refresh();
    router.push("/dashboard#progress-materi");
  };

  const handleRestartQuiz = async () => {
    setLoading(true);
    setPhase("question");
    setCurrentIndex(0);
    setSelectedIndex(null);
    setStreaks({}); // Reset seluruh streak saat mulai quiz baru
    setResults([]);

    let query = supabase.from("questions").select("*").eq("label", label);
    if (subParam !== "all") query = query.eq("sub_label", subParam);
    const { data } = await query;
    
    if (data && data.length > 0) {
      const shuffled = data.sort(() => Math.random() - 0.5).slice(0, QUIZ_COUNT);
      const parsed = shuffled.map(q => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []),
      }));
      setQuestions(parsed);
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="anim-pulse" style={{ fontSize: "3rem", textAlign: "center" }}>⚡</div>
    </div>
  );

  if (questions.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>😔</div>
        <h3>Soal Tidak Ditemukan</h3>
        <p style={{ color: "var(--gray-500)", marginTop: "8px" }}>Belum ada soal untuk subtopik ini.</p>
        <button onClick={confirmExit} className="btn btn--primary" style={{ marginTop: "20px" }}>Kembali</button>
      </div>
    </div>
  );

  const labelStyle = LABEL_STYLE[label] || LABEL_STYLE.TWK;
  const totalExp = results.reduce((sum, r) => sum + r.expGained, 0);
  const correctCount = results.filter(r => r.isCorrect).length;

  // ── SUMMARY ──────────────────────────────────────────────
  if (phase === "summary") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--gray-50)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>
            {correctCount >= QUIZ_COUNT * 0.8 ? "🏆" : correctCount >= QUIZ_COUNT * 0.5 ? "👍" : "💪"}
          </div>
          <h2 style={{ marginBottom: "8px" }}>Quiz Selesai!</h2>
          <p style={{ color: "var(--gray-500)", marginBottom: "28px" }}>{subLabel} · {label}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "24px" }}>
            <div className="stat-card">
              <div className="stat-card__value" style={{ color: "var(--green)", fontSize: "1.8rem" }}>{correctCount}</div>
              <div className="stat-card__label">Benar</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value" style={{ color: "var(--red)", fontSize: "1.8rem" }}>{QUIZ_COUNT - correctCount}</div>
              <div className="stat-card__label">Salah</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value" style={{ color: "var(--purple-dark)", fontSize: "1.8rem" }}>{totalExp > 0 ? `+${totalExp}` : totalExp}</div>
              <div className="stat-card__label">EXP</div>
            </div>
          </div>

          <div className="card" style={{ background: "var(--gray-900)", border: "none", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--yellow)", fontSize: "1.4rem" }}>⚡ {totalExp > 0 ? `+${totalExp}` : totalExp} EXP</div>
            <div style={{ color: "var(--gray-400)", fontSize: "0.85rem", marginTop: "4px" }}>Ditambahkan ke progress {label} — {subLabel}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={handleRestartQuiz} className="btn btn--primary btn--lg btn--block">
              🔄 Ulangi Quiz
            </button>
            <button onClick={confirmExit} className="btn btn--ghost btn--lg btn--block">
              ← Pilih Materi Lain
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const options = q.options || [];
  const progress = ((currentIndex + (phase === "feedback" ? 1 : 0)) / QUIZ_COUNT) * 100;
  
  // Baca streak sublabel aktif untuk Top Bar
  const activeStreak = streaks[q?.sub_label] || 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)", display: "flex", flexDirection: "column" }}>
      {/* TOP BAR */}
      <div style={{ background: "var(--white)", borderBottom: "2px solid var(--gray-200)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 20px", height: "60px", display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={handleExitClick} style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.82rem", color: "var(--gray-500)", background: "var(--gray-100)", border: "2px solid var(--gray-200)", borderRadius: "var(--radius-full)", padding: "6px 12px", cursor: "pointer" }}>
            ✕ Keluar
          </button>
          <div style={{ flex: 1 }}>
            <div className="xp-bar-track" style={{ height: "10px" }}>
              <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-500)" }}>
            {currentIndex + 1}/{QUIZ_COUNT}
          </div>
          {/* Tampilkan badge jika streak materi aktif >= 2 */}
          {activeStreak >= 2 && label !== "TKP" && (
            <div className="streak-badge">🔥 {activeStreak}</div>
          )}
        </div>
      </div>

      {/* MAIN */}
      <main style={{ flex: 1, maxWidth: "680px", margin: "0 auto", width: "100%", padding: "32px 20px 120px" }}>
        <div style={{ marginBottom: "16px" }}>
          <span className={`pill ${labelStyle.pill}`}>{label} · {q?.sub_label}</span>
        </div>

        <div className="card" style={{ marginBottom: "20px", padding: "24px" }}>
          <p 
            style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--gray-900)", fontWeight: 500, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: q.question_text }}
          />
        </div>

        {phase === "question" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`answer-option${selectedIndex === idx ? " selected" : ""}`}
              >
                <span className="answer-label">{OPTION_LABELS[idx]}</span>
                <span>{opt.text}</span>
              </button>
            ))}
          </div>
        )}

        {phase === "feedback" && (
          <QuizFeedback
            question={q}
            selectedIndex={selectedIndex}
            isCorrect={results[results.length - 1]?.isCorrect}
            expGained={results[results.length - 1]?.expGained}
            streakBonus={results[results.length - 1]?.streakBonus}
            explanation={q.explanation}
          />
        )}
      </main>

      {/* BOTTOM */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--white)", borderTop: "2px solid var(--gray-200)", padding: "12px 20px", zIndex: 50 }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", gap: "10px", justifyContent: "space-between" }}>
          {phase === "question" ? (
            <>
              <button onClick={handleExitClick} className="btn btn--ghost">
                Keluar
              </button>
              <button
                onClick={handleConfirmAnswer}
                disabled={selectedIndex === null}
                className="btn btn--primary"
                style={{ flex: 1, maxWidth: "280px" }}
              >
                Simpan
              </button>
            </>
          ) : (
            <>
              <button onClick={handleExitClick} className="btn btn--ghost">Keluar</button>
              <button onClick={handleNext} className="btn btn--primary" style={{ flex: 1, maxWidth: "280px" }}>
                {currentIndex >= questions.length - 1 ? "Lihat Hasil 🏆" : "Selanjutnya →"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* POPUP KONFIRMASI KELUAR */}
      {showExitPopup && (
        <div style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(0,0,0,0.6)", zIndex: 9999, 
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" 
        }}>
          <div className="card" style={{ 
            background: "var(--white)", width: "100%", maxWidth: "340px", 
            padding: "24px", textAlign: "center", 
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🚪</div>
            <h3 style={{ marginBottom: "8px", fontFamily: "var(--font-display)", fontWeight: 800 }}>Yakin ingin keluar?</h3>
            <p style={{ color: "var(--gray-500)", marginBottom: "24px", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Progress soal yang sudah dijawab akan tetap tersimpan, namun sesi latihan ini akan diakhiri.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={cancelExit} className="btn btn--ghost" style={{ flex: 1 }}>
                Batal
              </button>
              <button onClick={confirmExit} className="btn btn--red" style={{ flex: 1 }}>
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizRunPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><div className="anim-pulse" style={{ fontSize: "3rem" }}>⚡</div></div>}>
      <QuizContent />
    </Suspense>
  );
}
