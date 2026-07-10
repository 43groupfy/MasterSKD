/**
 * Premium System v2.0 — logic gating Freemium.
 * Batas latihan FREE bersifat GLOBAL: total maksimal soal UNIK yang boleh
 * dikerjakan lintas semua materi/label, bukan per materi.
 * Semua status divalidasi dari data server (Supabase). Client hanya membaca.
 */
import { supabase } from "./supabase";

export const FREE_QUESTION_LIMIT = 200;     // total soal unik gratis (lintas semua materi)
export const FREE_CAT_TOTAL_ATTEMPTS = 5;   // max total percobaan CAT gratis untuk FREE

// ── PREMIUM STATUS ───────────────────────────────────────────────────────
export async function getPremiumStatus(userId) {
  if (!userId) return { premium: false, premiumUntil: null, isActive: false };
  const { data } = await supabase
    .from("user_profiles")
    .select("premium, premium_until")
    .eq("user_id", userId)
    .maybeSingle();

  const premium = !!data?.premium;
  const premiumUntil = data?.premium_until || null;
  const isActive = premium && (!premiumUntil || new Date(premiumUntil) > new Date());
  return { premium, premiumUntil, isActive };
}

// ── PENGGUNAAN SOAL (batas total 200 soal unik, lintas semua materi) ────
// Mengembalikan Set berisi seluruh question_id unik yang pernah dikerjakan
// user, dari materi/label manapun.
export async function getSeenQuestionIdSet(userId) {
  const { data } = await supabase.from("quiz_logs").select("question_id").eq("user_id", userId);
  return new Set((data || []).map((r) => r.question_id));
}

export function remainingQuota(seenIdSet) {
  return Math.max(0, FREE_QUESTION_LIMIT - (seenIdSet?.size || 0));
}

export function isQuotaExhausted(seenIdSet, isPremiumActive) {
  if (isPremiumActive) return false;
  return (seenIdSet?.size || 0) >= FREE_QUESTION_LIMIT;
}

// Membangun kumpulan soal untuk sesi latihan FREE, menghormati batas total
// 200 soal unik. Soal yang sudah pernah dikerjakan boleh diulang bebas
// (tidak menambah kuota), soal baru dibatasi oleh sisa kuota yang ada.
export function buildFreeQuestionPool(allQuestions, seenIdSet) {
  const remaining = remainingQuota(seenIdSet);
  const newQs = allQuestions.filter((q) => !seenIdSet.has(q.id));
  const seenQs = allQuestions.filter((q) => seenIdSet.has(q.id));
  const shuffledNew = newQs.sort(() => Math.random() - 0.5).slice(0, remaining);
  return [...shuffledNew, ...seenQs].sort(() => Math.random() - 0.5);
}

// ── AKSES PAKET CAT ──────────────────────────────────────────────────────
export async function getCatAccess(userId) {
  const [profile, attemptsRes, purchasedRes] = await Promise.all([
    getPremiumStatus(userId),
    supabase.from("user_cat_attempts").select("*").eq("user_id", userId),
    supabase.from("purchased_cat_packages").select("package_id").eq("user_id", userId).eq("status", "approved"),
  ]);

  const attempts = attemptsRes.data || [];
  const totalFreeAttempts = attempts.reduce((sum, a) => sum + (a.attempt_count || 0), 0);
  const attemptsByPackage = {};
  attempts.forEach((a) => { attemptsByPackage[a.package_id] = a.attempt_count; });
  const purchasedIds = new Set((purchasedRes.data || []).map((p) => p.package_id));

  return { ...profile, totalFreeAttempts, attemptsByPackage, purchasedIds };
}

// Mengembalikan { allowed: boolean, reason?: 'free_quota' | 'locked_premium' | 'not_purchased' }
export function canStartPackage(pkg, access) {
  if (access.isActive) {
    if (pkg.tier === "addon") {
      return access.purchasedIds.has(pkg.id)
        ? { allowed: true }
        : { allowed: false, reason: "not_purchased" };
    }
    return { allowed: true }; // free & premium tier: unlimited utk user premium
  }

  // User FREE
  if (pkg.tier === "free") {
    return access.totalFreeAttempts < FREE_CAT_TOTAL_ATTEMPTS
      ? { allowed: true }
      : { allowed: false, reason: "free_quota" };
  }
  if (pkg.tier === "addon") {
    return access.purchasedIds.has(pkg.id)
      ? { allowed: true }
      : { allowed: false, reason: "not_purchased" };
  }
  // tier === 'premium'
  return { allowed: false, reason: "locked_premium" };
}

export async function incrementCatAttempt(userId, packageId) {
  const { data: existing } = await supabase
    .from("user_cat_attempts")
    .select("id, attempt_count")
    .eq("user_id", userId)
    .eq("package_id", packageId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_cat_attempts")
      .update({ attempt_count: existing.attempt_count + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("user_cat_attempts").insert({ user_id: userId, package_id: packageId, attempt_count: 1 });
  }
}

export async function requestPackagePurchase(userId, packageId) {
  return supabase
    .from("purchased_cat_packages")
    .insert({ user_id: userId, package_id: packageId, status: "pending" });
}

export async function requestPremiumUpgrade(userId, plan = "premium", note = null) {
  return supabase
    .from("premium_purchase_requests")
    .insert({ user_id: userId, plan, status: "pending", note });
}
