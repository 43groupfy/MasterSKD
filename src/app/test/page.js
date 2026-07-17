"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import GridNumbers from "../../components/GridNumbers";
import Timer from "../../components/Timer";
import { calculateExamScores } from "../../lib/scoring";
import { parseOptions, getMaxValue } from "../../lib/scoring";
import { OPTION_LABELS, LABEL_STYLE } from "../../lib/utils";

function TestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [bookmarks, setBookmarks] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!sessionId) { router.push("/packages"); return; }
    loadExam();
  }, [sessionId]);

  const loadExam = async () => {
    try {
      const { data: ses, error: sesErr } = await supabase
        .from("exam_sessions").select("*").eq("id", sessionId).single();
      if (sesErr) throw sesErr;
      if (ses.status === "finished") { router.push(`/result?session_id=${sessionId}`); return; }
      setSession(ses);

      const { data: items } = await supabase
        .from("exam_package_items").select("question_id, order_number")
        .eq("package_id", ses.package_id).order("order_number");

      const ids = items?.map(i => i.question_id) || [];
      const { data: qs } = await supabase.from("questions").select("*").in("id", ids);

      const ordered = items?.map(item =>
        qs?.find(q => q.id === item.question_id)
      ).filter(Boolean) || [];

      const parsed = ordered.map(q => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []),
      }));
      setQuestions(parsed);

      const { data: existing } = await supabase
        .from("exam_answers").select("*").eq("session_id", sessionId);
      if (existing?.length) {
        const am = {}, bm = {};
        existing.forEach(a => {
          if (a.selected_option !== null && a.selected_option !== undefined) am[a.question_id] = a.selected_option;
          if (a.is_bookmarked) bm[a.question_id] = true;
        });
        setAnswers(am);
        setBookmarks(bm);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const saveAnswer = (questionId, optionIndex, isBookmarked) => {
    supabase.from("exam_answers").upsert({
      session_id: sessionId,
      question_id: questionId,
      selected_option: optionIndex !== undefined ? optionIndex : null,
      is_bookmarked: isBookmarked || false,
    }).then(({ error }) => { if (error) console.error("Save error:", error); });
  };

  const handleSelectOption = (optionIndex) => {
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: optionIndex }));
    saveAnswer(q.id, optionIndex, bookmarks[q.id] || false);
  };

  const handleToggleBookmark = () => {
    const q = questions[currentIndex];
    if (!q) return;
    const newBm = !bookmarks[q.id];
    setBookmarks(prev => ({ ...prev, [q.id]: newBm }));
    saveAnswer(q.id, answers[q.id] !== undefined ? answers[q.id] : null, newBm);
  };

  const handleFinish = useCallback(async () => {
    if (isFinishing || !session) return;
    setIsFinishing(true);
    try {
      const scores = calculateExamScores(questions, answers);
      const { error: hErr } = await supabase.from("exam_history").insert({
        user_id: session.user_id,
        package_id: session.package_id,
        session_id: sessionId,
        score_total: scores.score_total,
        score_twk: scores.score_twk,
        score_tiu: scores.score_tiu,
        score_tkp: scores.score_tkp,
        completed_at: new Date().toISOString(),
      });
      if (hErr) throw hErr;
      await supabase.from("exam_sessions").update({ status: "finished", end_time: new Date().toISOString() }).eq("id", sessionId);
      router.push(`/result?session_id=${sessionId}`);
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
      setIsFinishing(false);
    }
  }, [isFinishing, session, questions, answers, sessionId, router]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--gray-50)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }} className="anim-pulse">📚</div>
        <p style={{ color: "var(--gray-500)", fontFamily: "var(--font-display)", fontWeight: 700 }}>Memuat soal ujian...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>❌</div>
        <h3>Terjadi Kesalahan</h3>
        <p style={{ color: "var(--gray-500)", marginTop: "8px" }}>{error}</p>
        <button onClick={() => router.push("/packages")} className="btn btn--primary" style={{ marginTop: "20px" }}>Kembali</button>
      </div>
    </div>
  );

  if (questions.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>😔</div>
        <h3>Tidak Ada Soal</h3>
        <p style={{ color: "var(--gray-500)", marginTop: "8px" }}>Paket ini belum memiliki soal.</p>
        <button onClick={() => router.push("/packages")} className="btn btn--primary" style={{ marginTop: "20px" }}>Kembali</button>
      </div>
    </div>
  );

  const q = questions[currentIndex];
  const options = q.options || [];
  const selectedIndex = answers[q.id];
  const isBookmarked = bookmarks[q.id] || false;
  const answeredCount = Object.keys(answers).length;
  const progressPct = (answeredCount / questions.length) * 100;
  const labelStyle = LABEL_STYLE[q.label] || LABEL_STYLE.TWK;

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)", display: "flex", flexDirection: "column" }}>

      {/* TOP BAR */}
      <div style={{ background: "var(--white)", borderBottom: "2px solid var(--gray-200)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", gap: "12px", height: "60px" }}>
          <button onClick={() => setShowQuitModal(true)} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--gray-100)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray-500)", fontSize: "1rem", flexShrink: 0 }}>
            ✕
          </button>
          <div style={{ flex: 1 }}>
            <div className="xp-bar-track" style={{ height: "10px" }}>
              <div className="xp-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setShowGrid(!showGrid)} className="btn btn--ghost btn--sm" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
              {showGrid ? "Tutup" : "Navigator"}
            </button>
          )}
          {session && <Timer startTime={session.start_time} onTimeUp={handleFinish} />}
        </div>
      </div>

      {/* MAIN */}
      <div style={{
        flex: 1,
        maxWidth: "1140px",
        margin: "0 auto",
        width: "100%",
        padding: "24px 20px 100px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 280px",
        gap: "24px",
        alignItems: "start"
      }}>

        {/* QUESTION AREA */}
        <div>
          {/* Question header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span className={`pill ${labelStyle.pill}`}>{q.label} · {q.sub_label}</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-500)" }}>
              {currentIndex + 1} / {questions.length}
            </span>
          </div>

          {/* Question text */}
          <div className="card" style={{ marginBottom: "16px", padding: "24px" }}>
            <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "var(--gray-900)", fontWeight: 500, margin: 0 }}>
              {q.question_text}
            </p>
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {options.map((opt, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`answer-option${isSelected ? " selected" : ""}`}
                >
                  <span className="answer-label">{OPTION_LABELS[idx]}</span>
                  <span>{opt.text}</span>
                  {q.label === "TKP" && (
                    <span style={{ marginLeft: "auto", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8rem", color: "var(--gray-400)" }}>
                      {opt.value}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile grid (toggle) */}
          {isMobile && showGrid && (
            <div className="card" style={{ marginTop: "20px", padding: "20px" }}>
              <GridNumbers
                questions={questions}
                answers={answers}
                bookmarks={bookmarks}
                currentIndex={currentIndex}
                isReview={false}
                onNavigate={(idx) => { setCurrentIndex(idx); setShowGrid(false); }}
              />
            </div>
          )}
        </div>

        {/* GRID SIDEBAR (desktop only) */}
        {!isMobile && (
          <div className="card" style={{ padding: "20px", position: "sticky", top: "80px" }}>
            <GridNumbers
              questions={questions}
              answers={answers}
              bookmarks={bookmarks}
              currentIndex={currentIndex}
              isReview={false}
              onNavigate={setCurrentIndex}
            />
            <div style={{ marginTop: "16px", padding: "12px 0", borderTop: "2px solid var(--gray-100)" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--gray-500)", marginBottom: "10px" }}>
                Terjawab: <strong style={{ color: "var(--green)" }}>{answeredCount}</strong> / {questions.length}
              </div>
              <button
                onClick={handleFinish}
                disabled={isFinishing}
                className="btn btn--yellow btn--block"
              >
                {isFinishing ? "Menyimpan..." : "Selesai & Lihat Hasil 🏆"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--white)", borderTop: "2px solid var(--gray-200)", padding: "12px 20px", zIndex: 50 }}>
        <div style={{ maxWidth: "1140px", margin: "0 auto", display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="btn btn--ghost btn--sm" style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}>
            ← Sebelumnya
          </button>

          <button
            onClick={handleToggleBookmark}
            className="btn btn--sm"
            style={{ background: isBookmarked ? "var(--yellow-light)" : "var(--gray-100)", color: isBookmarked ? "var(--yellow-dark)" : "var(--gray-500)", border: `2px solid ${isBookmarked ? "var(--yellow-dark)" : "var(--gray-200)"}` }}
          >
            {isBookmarked ? "🔖 Ditandai" : "🔖 Tandai"}
          </button>

          {currentIndex === questions.length - 1 ? (
            <button onClick={handleFinish} disabled={isFinishing} className="btn btn--yellow">
              {isFinishing ? "Menyimpan..." : "Selesai 🏆"}
            </button>
          ) : (
            <button onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))} className="btn btn--primary btn--sm">
              Selanjutnya →
            </button>
          )}
        </div>
      </div>

      {/* QUIT MODAL */}
      {showQuitModal && (
        <div className="overlay" onClick={() => setShowQuitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🚪</div>
            <h3 style={{ marginBottom: "8px" }}>Yakin Mau Keluar?</h3>
            <p style={{ color: "var(--gray-500)", marginBottom: "24px", fontSize: "0.95rem" }}>
              Jawaban yang sudah diisi akan tersimpan. Kamu bisa lanjutkan nanti dengan memilih paket yang sama.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button onClick={handleFinish} disabled={isFinishing} className="btn btn--yellow btn--block">
                Selesaikan & Lihat Hasil
              </button>
              <button onClick={() => router.push("/dashboard")} className="btn btn--ghost btn--block">
                Simpan & Keluar
              </button>
              <button onClick={() => setShowQuitModal(false)} className="btn btn--ghost btn--block" style={{ color: "var(--gray-500)" }}>
                Lanjutkan Ujian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="anim-pulse" style={{ fontSize: "3rem" }}>📚</div>
      </div>
    }>
      <TestContent />
    </Suspense>
  );
}
