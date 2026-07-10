/**
 * Scoring Logic SKD
 * TWK & TIU: benar = 5, salah = 0
 * TKP: gunakan value opsi langsung (1-5)
 */

export function parseOptions(options) {
  if (typeof options === "string") {
    try { return JSON.parse(options); } catch { return []; }
  }
  return options || [];
}

export function getMaxValue(options) {
  return Math.max(...parseOptions(options).map((o) => Number(o.value) || 0));
}

export function calculateQuestionScore(question, selectedOptionIndex) {
  const options = parseOptions(question.options);
  const selected = options[selectedOptionIndex];
  if (!selected) return 0;

  if (question.label === "TKP") {
    return Number(selected.value) || 0;
  }
  // TWK & TIU
  const maxVal = getMaxValue(options);
  return Number(selected.value) === maxVal ? 5 : 0;
}

export function isAnswerCorrect(question, selectedOptionIndex) {
  if (question.label === "TKP") return true;
  const options = parseOptions(question.options);
  const selected = options[selectedOptionIndex];
  const maxVal = getMaxValue(options);
  return Number(selected?.value) === maxVal;
}

export function calculateExamScores(questions, answers) {
  let score_twk = 0, score_tiu = 0, score_tkp = 0;

  questions.forEach((q) => {
    const selectedIndex = answers[q.id];
    if (selectedIndex === undefined || selectedIndex === null) return;
    const score = calculateQuestionScore(q, selectedIndex);
    if (q.label === "TWK") score_twk += score;
    else if (q.label === "TIU") score_tiu += score;
    else if (q.label === "TKP") score_tkp += score;
  });

  return {
    score_total: score_twk + score_tiu + score_tkp,
    score_twk,
    score_tiu,
    score_tkp,
  };
}
