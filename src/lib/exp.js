/**
 * EXP Calculation untuk Mode Quiz
 * TWK & TIU: benar +5, salah -1 (min 0), streak bonus
 * TKP: ambil value opsi langsung, no minus, no streak
 */
import { parseOptions, getMaxValue } from "./scoring";

export const calculateQuizEXP = (question, selectedIndex, currentStreak, isCorrect) => {
  const { label, options } = question;
  const selectedOption = options[selectedIndex];
  
  let exp = 0;
  let streakBonus = 0;
  let newStreak = currentStreak;

  if (label === "TKP") {
    // TKP: Ambil nilai opsi langsung (1-5)
    exp = selectedOption?.value || 0;
    
    // TKP tidak ada konsep "salah", jadi tidak menambah atau mematikan streak
    newStreak = currentStreak; 
  } else {
    // TWK & TIU
    if (isCorrect) {
      exp = 5; // +5 jika benar
      newStreak = currentStreak + 1;
      
      // Streak Bonus: jumlah kali benar dikurangi satu
      if (newStreak > 1) {
        streakBonus = newStreak - 1;
        exp += streakBonus; // Tambahkan bonus ke total exp
      }
    } else {
      exp = -1; // -1 jika salah
      newStreak = 0; // Streak reset ke 0
    }
  }

  return { exp, streakBonus, newStreak };
};

export function calculateLevel(totalExp) {
  return Math.floor(totalExp / 100) + 1;
}

export const getLevelProgress = (totalExp) => {
  // Asumsi 1 level = 100 EXP
  const level = Math.floor(totalExp / 100) + 1;
  const expThisLevel = totalExp % 100;
  
  // PERBAIKAN: Pastikan ini angka target maksimal per level (misal 100)
  // Jangan dikurangi dengan expThisLevel
  const expToNext = 100; 

  return { level, expThisLevel, expToNext };
};