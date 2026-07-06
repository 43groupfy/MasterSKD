export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hari ini";
  if (d.toDateString() === yesterday.toDateString()) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function calculateRemainingTime(startTime) {
  const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;
  return Math.max(0, 6000 - Math.floor(elapsed));
}

export function getGridColor(questionId, answers, bookmarks, isReview, question) {
  if (!isReview) {
    if (bookmarks[questionId]) return "yellow";
    if (answers[questionId] !== undefined) return "blue";
    return "gray";
  }
  // Review mode
  const selectedIndex = answers[questionId];
  if (selectedIndex === undefined) return "gray";
  if (!question) return "gray";

  if (question.label === "TKP") {
    const opts = typeof question.options === "string"
      ? JSON.parse(question.options)
      : question.options || [];
    const val = Number(opts[selectedIndex]?.value) || 0;
    if (val <= 3) return "red";
    if (val === 4) return "yellow";
    return "green";
  }
  // TWK & TIU
  const opts = typeof question.options === "string"
    ? JSON.parse(question.options)
    : question.options || [];
  const maxVal = Math.max(...opts.map((o) => Number(o.value) || 0));
  const selectedVal = Number(opts[selectedIndex]?.value) || 0;
  return selectedVal === maxVal ? "green" : "red";
}

export const GRID_COLORS = {
  gray:   { border: "var(--gray-200)",    bg: "var(--white)",        text: "var(--gray-500)" },
  blue:   { border: "var(--blue)",        bg: "var(--blue-light)",   text: "var(--blue-dark)" },
  yellow: { border: "var(--yellow-dark)", bg: "var(--yellow-light)", text: "var(--yellow-dark)" },
  green:  { border: "var(--green)",       bg: "var(--green-light)",  text: "var(--green-dark)" },
  red:    { border: "var(--red)",         bg: "var(--red-light)",    text: "var(--red-dark)" },
};

export const LABEL_STYLE = {
  TWK: { pill: "pill--blue",   color: "var(--blue)",        bg: "var(--blue-light)" },
  TIU: { pill: "pill--purple", color: "var(--purple-dark)", bg: "var(--purple-light)" },
  TKP: { pill: "pill--green",  color: "var(--green-dark)",  bg: "var(--green-light)" },
};

export const OPTION_LABELS = ["A", "B", "C", "D", "E"];
