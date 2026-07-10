// lib/premium.js
/**
 * Premium System v2.1 — Gating Freemium sesuai PRD.
 * - Kuota latihan soal: 200 total (akumulasi unik question_id)
 * - Kuota CAT gratis: 4 total percobaan (bebas distribusi)
 */
import { supabase } from "./supabase";

export const FREE_QUESTION_LIMIT_TOTAL = 200;  // total soal unik yang boleh dilihat FREE
export const FREE_CAT_TOTAL_ATTEMPTS = 4;      // max total percobaan CAT gratis

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

// ── TOTAL PENGGUNAAN SOAL (untuk batas 200 total) ─────────────────────
// Menghitung total soal unik yang pernah dilihat user (seluruh label & sub)
export async function getTotalSeenQuestionCount(userId) {
  const { data } = await supabase
    .from("quiz_logs")
    .select("question_id", { distinct: true })
    .eq("user_id", userId);
  return data?.length || 0;
}

// Untuk keperluan pool building, kita ambil semua question_id yang sudah pernah dilihat
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

// Untuk pengecekan kuota di level sub (kita tetap pakai untuk tampilan, tapi gating global)
export function materiUsageCount(seenMap, label, subLabel) {
  return seenMap?.[label]?.[subLabel]?.size || 0;
}

// Cek apakah kuota total masih tersisa
export async function hasRemainingFreeQuota(userId) {
  const seenCount = await getTotalSeenQuestionCount(userId);
  return seenCount < FREE_QUESTION_LIMIT_TOTAL;
}

// Membangun pool soal untuk FREE: batasi total soal yang akan ditampilkan agar
// total unik yang dilihat <= 200. Soal yang sudah pernah dilihat tidak dimasukkan.
// Fungsi ini akan mengambil soal baru sebanyak mungkin sampai mencapai batas 200.
export function buildFreeQuestionPool(allQuestions, seenMapForLabel) {
  // Hitung total yang sudah dilihat dari semua label
  let totalSeen = 0;
  Object.values(seenMapForLabel).forEach(subMap => {
    Object.values(subMap).forEach(set => { totalSeen += set.size; });
  });

  const remaining = Math.max(0, FREE_QUESTION_LIMIT_TOTAL - totalSeen);
  if (remaining <= 0) return [];

  // Ambil soal baru (belum pernah dilihat) secara acak sebanyak remaining
  const seenIds = new Set();
  Object.values(seenMapForLabel).forEach(subMap => {
    Object.values(subMap).forEach(set => {
      set.forEach(id => seenIds.add(id));
    });
  });

  const newQuestions = allQuestions.filter(q => !seenIds.has(q.id));
  const shuffled = newQuestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, remaining);
}

// Cek apakah user masih punya kuota (untuk tombol quiz)
export async function canDoFreeQuiz(userId) {
  const seenCount = await getTotalSeenQuestionCount(userId);
  return seenCount < FREE_QUESTION_LIMIT_TOTAL;
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
