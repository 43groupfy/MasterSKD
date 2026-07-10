"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import GridNumbers from "../../components/GridNumbers";
import Navbar from "../../components/Navbar";
import { parseOptions, getMaxValue } from "../../lib/scoring";
import { OPTION_LABELS, LABEL_STYLE } from "../../lib/utils";
import Link from "next/link";

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [bookmarks, setBookmarks] = useState({});
  const [history, setHistory] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("summary"); // "summary" | "review"

  useEffect(() => {
    if (!sessionId) { router.push("/dashboard"); return; }
    loadResult();
  }, [sessionId]);

  const loadResult = async () => {
    try {
      // Load session
      const { data: ses } = await supabase.from("exam_sessions").select("*").eq("id", sessionId).single();
      setSession(ses);

      // Load questions (ordered)
      const { data: items } = await supabase
        .from("exam_package_items").select("question_id, order_number")
        .eq("package_id", ses.package_id).order("order_number");
      const ids = items?.map(i => i.question_id) || [];
      const { data: qs } = await supabase.from("questions").select("*").in("id", ids);
      const ordered = items?.map(it => qs?.find(q => q.id === it.question_id)).filter(Boolean) || [];
      const parsed = ordered.map(q => ({ ...q, options: typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []) }));
      setQuestions(parsed);

      // Load answers
      const { data: ans } = await supabase.from("exam_answers").select("*").eq("session_id", sessionId);
      const am = {}, bm = {};
      ans?.forEach(a => {
        if (a.selected_option !== null && a.selected_option !== undefined) am[a.question_id] = a.selected_option;
        if (a.is_bookmarked) bm[a.question_id] = true;
      });
      setAnswers(am);
      setBookmarks(bm);

      // Load exam history for scores
      const { data: hist } = await supabase.from("exam_history").select("*").eq("session_id", sessionId).single();
      setHistory(hist);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) return (
    <>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="anim-pulse" style={{ fontSize: "3rem", textAlign: "center" }}>🏆</div>
      </div>
    </>
  );

  if (!history) return (
    <>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>❌</div>
          <h3>Data Hasil Tidak Ditemukan</h3>
          <p style={{ color: "var(--gray-500)", marginTop: "8px" }}>Mungkin ujian belum diselesaikan.</p>
          <button onClick={() => router.push("/dashboard")} className="btn btn--primary" style={{ marginTop: "20px" }}>Dashboard</button>
        </div>
      </div>
    </>
  );

  const maxPossible = 550;
  const pct = Math.round((history.score_total / maxPossible) * 100);
  const passing = history.score_total >= 311;
  const conicDeg = Math.round((history.score_total / maxPossible) * 360);

  const getMsg = () => {
    if (pct >= 80) return { emoji: "🏆", title: "Luar Biasa!" };
    if (pct >= 65) return { emoji: "🎉", title: "Keren Banget!" };
    if (pct >= 50) return { emoji: "👍", title: "Lumayan!" };
    return { emoji: "💪", title: "Terus Semangat!" };
  };
  const msg = getMsg();

  // ── REVIEW MODE ──────────────────────────────────────────
  if (view === "review") {
    const q = questions[currentIndex];
    if (!q) return null;
    const options = q.options || [];
    const selectedIndex = answers[q.id];
    const maxVal = getMaxValue(options);
    const labelStyle = LABEL_STYLE[q.label] || LABEL_STYLE.TWK;

    return (
      <div style={{ minHeight: "100vh", background: "var(--gray-50)", display: "flex", flexDirection: "column" }}>
        {/* TOP BAR */}
        <div style={{ background: "var(--white)", borderBottom: "2px solid var(--gray-200)", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", gap: "12px", height: "60px" }}>
            <button onClick={() => setView("summary")} style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--blue)", background: "var(--blue-light)", border: "2px solid var(--blue)", borderRadius: "var(--radius-full)", padding: "6px 14px", cursor: "pointer" }}>
              ← Kembali ke Hasil
            </button>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--gray-500)", fontSize: "0.85rem" }}>
              REVIEW MODE (Read-Only)
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-500)" }}>
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, maxWidth: "1140px", margin: "0 auto", width: "100%", padding: "24px 20px 100px", display: "grid", gridTemplateColumns: "1fr 280px", gap: "24px", alignItems: "start" }}>
          {/* Question area */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span className={`pill ${labelStyle.pill}`}>{q.label} · {q.sub_label}</span>
            </div>
            <div className="card" style={{ marginBottom: "16px", padding: "24px" }}>
              <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--gray-900)", fontWeight: 500, margin: 0 }}>
                {q.question_text}
              </p>
            </div>

            {/* Options with color coding */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {options.map((opt, idx) => {
                const isSelected = selectedIndex === idx;
                const isCorrectOpt = q.label !== "TKP" && Number(opt.value) === maxVal;
                let cls = "answer-option";
                if (q.label === "TKP") {
                  cls += isSelected ? " selected" : "";
                } else {
                  if (isCorrectOpt) cls += " correct";
                  else if (isSelected) cls += " wrong";
                  else cls += " dimmed";
                }
                return (
                  <div key={idx} className={cls} style={{ cursor: "default" }}>
                    <span className="answer-label">{OPTION_LABELS[idx]}</span>
                    <span>{opt.text}</span>
                    {q.label === "TKP" && (
                      <span style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8rem", color: "var(--purple-dark)" }}>
                        +{opt.value}
                      </span>
                    )}
                    {!isSelected && isCorrectOpt && q.label !== "TKP" && (
                      <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--green-dark)", fontWeight: 700 }}>✅ Benar</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pembahasan */}
            {q.explanation && (
              <div className="feedback-banner feedback-banner--correct">
                <div className="feedback-icon">💡</div>
                <div>
                  <div className="feedback-title">Pembahasan</div>
                  <div className="feedback-body">{q.explanation}</div>
                </div>
              </div>
            )}
          </div>

          {/* Grid sidebar */}
          <div className="card hide-mobile" style={{ padding: "20px", position: "sticky", top: "80px" }}>
            <GridNumbers
              questions={questions}
              answers={answers}
              bookmarks={bookmarks}
              currentIndex={currentIndex}
              isReview={true}
              onNavigate={setCurrentIndex}
            />
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--white)", borderTop: "2px solid var(--gray-200)", padding: "12px 20px", zIndex: 50 }}>
          <div style={{ maxWidth: "1140px", margin: "0 auto", display: "flex", gap: "10px", justifyContent: "space-between" }}>
            <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="btn btn--ghost btn--sm" style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}>
              ← Sebelumnya
            </button>
            <button onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))} disabled={currentIndex === questions.length - 1} className="btn btn--primary btn--sm" style={{ opacity: currentIndex === questions.length - 1 ? 0.3 : 1 }}>
              Selanjutnya →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUMMARY VIEW ─────────────────────────────────────────
  return (
    <>
      <Navbar />
      <main className="page-main">
        <div className="container--narrow">
          {/* Hero score */}
          <div className="card card--raised" style={{ textAlign: "center", padding: "48px 32px", marginBottom: "20px", background: passing ? "linear-gradient(160deg, var(--green-light), var(--white))" : "linear-gradient(160deg, var(--yellow-light), var(--white))", borderColor: passing ? "var(--green)" : "var(--yellow-dark)" }}>
            <div style={{ fontSize: "4rem", marginBottom: "8px" }}>{msg.emoji}</div>
            <h2 style={{ marginBottom: "4px" }}>{msg.title}</h2>

            {/* Score Ring */}
            <div style={{ width: "160px", height: "160px", borderRadius: "50%", background: `conic-gradient(${passing ? "var(--green)" : "var(--yellow-dark)"} ${conicDeg}deg, var(--gray-200) 0%)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "24px auto", position: "relative" }}>
              <div style={{ position: "absolute", inset: "12px", borderRadius: "50%", background: "var(--white)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2.2rem", lineHeight: 1 }}>{history.score_total}</div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Poin</div>
              </div>
            </div>

            <div className={`pill ${passing ? "pill--green" : "pill--yellow"}`} style={{ margin: "0 auto" }}>
              {passing ? "✅ Berpotensi Lulus Passing Grade" : "⚠️ Di Bawah Passing Grade"}
            </div>
          </div>

          {/* Score per label */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
            {[
              { label: "TWK", score: history.score_twk, max: 150, color: "var(--blue)" },
              { label: "TIU", score: history.score_tiu, max: 175, color: "var(--purple-dark)" },
              { label: "TKP", score: history.score_tkp, max: 225, color: "var(--green)" },
            ].map(item => (
              <div key={item.label} className="stat-card">
                <div className="stat-card__value" style={{ color: item.color, fontSize: "1.5rem" }}>{item.score}</div>
                <div className="stat-card__label">{item.label}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--gray-400)", marginTop: "2px" }}>/ {item.max}</div>
              </div>
            ))}
          </div>

          {/* Summary stats */}
          <div className="card" style={{ marginBottom: "20px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color: "var(--green)" }}>{Object.keys(answers).length}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 600 }}>TERJAWAB</div>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color: "var(--orange)" }}>{questions.length - Object.keys(answers).length}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 600 }}>DILEWATI</div>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", color: "var(--blue)" }}>{pct}%</div>
                <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 600 }}>SKOR</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => setView("review")} className="btn btn--blue btn--lg btn--block">
              📖 Review Jawaban
            </button>
            <Link href="/packages" className="btn btn--primary btn--lg btn--block">
              🔄 Coba Lagi
            </Link>
            <Link href="/dashboard" className="btn btn--ghost btn--lg btn--block">
              ← Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}><div className="anim-pulse" style={{ fontSize: "3rem" }}>🏆</div></div>}>
      <ResultContent />
    </Suspense>
  );
}
