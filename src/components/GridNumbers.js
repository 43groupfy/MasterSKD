"use client";
import { getGridColor, GRID_COLORS } from "../lib/utils";

export default function GridNumbers({
  questions = [],
  answers = {},
  bookmarks = {},
  currentIndex = 0,
  isReview = false,
  onNavigate = () => {},
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.78rem", color: "var(--gray-500)", letterSpacing: "0.8px", textTransform: "uppercase" }}>
        Navigator Soal
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px", maxHeight: "340px", overflowY: "auto" }}>
        {questions.map((q, idx) => {
          const color = getGridColor(q.id, answers, bookmarks, isReview, q);
          const gc = GRID_COLORS[color];
          const isActive = idx === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => onNavigate(idx)}
              title={`Soal ${idx + 1} — ${q.label}`}
              style={{
                aspectRatio: "1",
                borderRadius: "6px",
                border: `2px solid ${isActive ? "var(--purple-dark)" : gc.border}`,
                background: isActive ? "var(--purple-light)" : gc.bg,
                color: isActive ? "var(--purple-dark)" : gc.text,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.72rem",
                cursor: "pointer",
                transition: "all .15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "4px" }}>
        {[
          { color: "gray",   label: "Belum" },
          { color: "blue",   label: "Dijawab" },
          { color: "yellow", label: "Bookmark" },
          ...(isReview ? [
            { color: "green", label: "Benar" },
            { color: "red",   label: "Salah" },
          ] : []),
        ].map((item) => (
          <div key={item.color} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "var(--gray-500)" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: GRID_COLORS[item.color].bg, border: `2px solid ${GRID_COLORS[item.color].border}`, flexShrink: 0 }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
