"use client";
import { parseOptions, getMaxValue } from "../lib/scoring";
import { OPTION_LABELS } from "../lib/utils";

export default function QuizFeedback({ question, selectedIndex, isCorrect, expGained, streakBonus, explanation }) {
  const options = parseOptions(question.options);
  const maxVal = getMaxValue(options);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", animation: "slideUp .3s cubic-bezier(.34,1.56,.64,1)" }}>
      {/* Result Banner */}
      <div style={{
        background: isCorrect ? "var(--green-light)" : "var(--red-light)",
        border: `2px solid ${isCorrect ? "var(--green)" : "var(--red)"}`,
        borderRadius: "var(--radius-lg)", padding: "16px 20px",
        display: "flex", alignItems: "flex-start", gap: "12px",
      }}>
        <div style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>
          {isCorrect ? "✅" : "❌"}
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: isCorrect ? "var(--green-dark)" : "var(--red-dark)", marginBottom: "4px" }}>
            {isCorrect ? "Jawaban Benar!" : "Jawaban Kurang Tepat"}
          </div>
          {explanation && (
            <div style={{ fontSize: "0.88rem", color: "var(--gray-700)", lineHeight: 1.7 }}>
              <strong>Pembahasan:</strong> <span dangerouslySetInnerHTML={{ __html: explanation }} />
            </div>
          )}
        </div>
      </div>

      {/* Options review */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {options.map((opt, idx) => {
          const isSelected = idx === selectedIndex;
          const isCorrectOpt = Number(opt.value) === maxVal && question.label !== "TKP";
          let bg = "var(--white)", border = "var(--gray-200)", color = "var(--gray-700)";
          if (question.label === "TKP") {
            bg = isSelected ? "var(--blue-light)" : "var(--white)";
            border = isSelected ? "var(--blue)" : "var(--gray-200)";
          } else {
            if (isCorrectOpt) { bg = "var(--green-light)"; border = "var(--green)"; }
            else if (isSelected) { bg = "var(--red-light)"; border = "var(--red)"; }
          }
          return (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px",
              borderRadius: "var(--radius-md)", border: `2px solid ${border}`,
              background: bg, fontSize: "0.88rem", color,
            }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, width: "20px", flexShrink: 0 }}>{OPTION_LABELS[idx]}</span>
              <span>{opt.text}</span>
              {question.label === "TKP" && (
                <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--purple-dark)" }}>+{opt.value}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* EXP badge */}
      {expGained > 0 && (
        <div style={{
          background: "var(--purple-light)", border: "2px solid var(--purple-dark)",
          borderRadius: "var(--radius-md)", padding: "10px 14px",
          display: "flex", alignItems: "center", gap: "8px",
          fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--purple-dark)",
        }}>
          ⚡ +{expGained} EXP
          {streakBonus > 0 && (
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--orange)", background: "var(--orange-light)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
              🔥 Streak Bonus +{streakBonus}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
