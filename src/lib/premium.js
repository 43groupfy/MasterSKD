/**
 * Premium System v2.0 — logic gating Freemium sesuai PRD.
 * Semua status divalidasi dari data server (Supabase). Client hanya membaca.
 */
import { supabase } from "./supabase";

export const FREE_QUESTION_LIMIT = 20;      // max soal unik per materi (sub_label) untuk FREE
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

// ── PENGGUNAAN SOAL (untuk batas 20 soal/materi) ─────────────────────────
// Mengembalikan { [label]: { [sub_label]: Set(question_id) } }
export async function getAllSeenQuestionIds(userId, label = null) {
  let query = supabase.from("quiz_logs").select("question_id, label, sub_label").eq("user_id", userId);
  if (label) query = query.eq("label", label);
  const { data } = await query;

  const map = {};
  (data || []).forEach((r) => {
    map[r.label] = map[r.label] || {};
    if (!map[r.label][r.sub_label]) map[r.label][r.sub_label] = new Set();
    map[r.label][r.sub_label].add(r.question_id);
  });
  return map;
}

export function materiUsageCount(seenMap, label, subLabel) {
  return seenMap?.[label]?.[subLabel]?.size || 0;
}

export function isMateriLocked(seenMap, label, subLabel, isPremiumActive) {
  if (isPremiumActive) return false;
  return materiUsageCount(seenMap, label, subLabel) >= FREE_QUESTION_LIMIT;
}

// Membangun kumpulan soal untuk sesi latihan FREE, menghormati batas 20
// soal unik PER sub_label. Soal yang sudah pernah dikerjakan tidak dihitung
// ulang, tapi juga tidak lagi ditawarkan sebagai "soal baru" setelah kuota
// materinya habis.
export function buildFreeQuestionPool(allQuestions, seenMapForLabel) {
  const bySub = {};
  allQuestions.forEach((q) => {
    (bySub[q.sub_label] = bySub[q.sub_label] || []).push(q);
  });

  let pool = [];
  Object.entries(bySub).forEach(([sub, qs]) => {
    const seenSet = seenMapForLabel?.[sub] || new Set();
    const allowedNew = Math.max(0, FREE_QUESTION_LIMIT - seenSet.size);
    if (allowedNew <= 0) return; // materi ini sudah habis kuotanya
    const newQs = qs.filter((q) => !seenSet.has(q.id));
    const shuffled = newQs.sort(() => Math.random() - 0.5);
    pool.push(...shuffled.slice(0, allowedNew));
  });

  return pool.sort(() => Math.random() - 0.5);
}

export function hasAnyRemainingQuota(allQuestions, seenMapForLabel) {
  const bySub = {};
  allQuestions.forEach((q) => {
    (bySub[q.sub_label] = bySub[q.sub_label] || []).push(q);
  });
  return Object.keys(bySub).some(
    (sub) => (seenMapForLabel?.[sub]?.size || 0) < FREE_QUESTION_LIMIT
  );
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
