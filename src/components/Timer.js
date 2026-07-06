"use client";
import { useEffect, useState } from "react";
import { formatTime, calculateRemainingTime } from "../lib/utils";

export default function Timer({ startTime, onTimeUp = () => {} }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateRemainingTime(startTime));

  useEffect(() => {
    const tick = setInterval(() => {
      const remaining = calculateRemainingTime(startTime);
      setTimeLeft(remaining);
      if (remaining <= 0) { clearInterval(tick); onTimeUp(); }
    }, 1000);
    return () => clearInterval(tick);
  }, [startTime, onTimeUp]);

  const isDanger = timeLeft <= 300;
  return (
    <div style={{
      fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem",
      color: isDanger ? "var(--red)" : "var(--gray-700)",
      background: isDanger ? "var(--red-light)" : "var(--gray-100)",
      padding: "6px 14px", borderRadius: "var(--radius-full)",
      border: isDanger ? "2px solid var(--red)" : "2px solid var(--gray-200)",
      transition: "all .5s", whiteSpace: "nowrap",
      animation: isDanger ? "pulse 1s ease-in-out infinite" : "none",
    }}>
      ⏱ {formatTime(timeLeft)}
    </div>
  );
}
