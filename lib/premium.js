// lib/premium.js
import { supabase } from './supabase';

const FREE_MATERIAL_LIMIT = 20;
const FREE_CAT_PACKAGES_LIMIT = 2;
const FREE_CAT_ATTEMPTS_LIMIT = 5;

/**
 * Cek apakah user premium
 */
export async function isPremium(userId) {
  const { data, error } = await supabase
    .from('user_premium')
    .select('is_premium, premium_until')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return false;

  // Jika ada premium_until, cek masa berlaku
  if (data.premium_until) {
    const now = new Date();
    const until = new Date(data.premium_until);
    if (until > now) {
      return true;
    } else {
      // Jika sudah lewat, update is_premium menjadi false (opsional)
      await supabase
        .from('user_premium')
        .update({ is_premium: false })
        .eq('user_id', userId);
      return false;
    }
  }

  return data.is_premium || false;
}

/**
 * Dapatkan jumlah soal yang sudah dikerjakan untuk suatu materi
 * (Menggunakan exp_points dari user_progress sebagai indikator)
 */
export async function getMaterialProgress(userId, label, subLabel) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('exp_points')
    .eq('user_id', userId)
    .eq('label', label)
    .eq('sub_label', subLabel)
    .maybeSingle();

  if (error || !data) return 0;
  // Asumsikan exp_points adalah jumlah soal yang dikerjakan (bisa disesuaikan)
  return data.exp_points || 0;
}

/**
 * Cek apakah user dapat mengakses materi (latihan)
 */
export async function canAccessMaterial(userId, label, subLabel) {
  const prem = await isPremium(userId);
  if (prem) return true;

  const progress = await getMaterialProgress(userId, label, subLabel);
  return progress < FREE_MATERIAL_LIMIT;
}

/**
 * Dapatkan sisa kuota materi
 */
export async function getMaterialRemaining(userId, label, subLabel) {
  const prem = await isPremium(userId);
  if (prem) return Infinity;

  const progress = await getMaterialProgress(userId, label, subLabel);
  return Math.max(0, FREE_MATERIAL_LIMIT - progress);
}

/**
 * Dapatkan daftar paket CAT premium bawaan (is_premium_cat = true)
 */
export async function getPremiumCatPackages() {
  const { data, error } = await supabase
    .from('exam_packages')
    .select('id, name')
    .eq('is_premium_cat', true);
  if (error) return [];
  return data || [];
}

/**
 * Dapatkan total attempt CAT yang sudah digunakan user untuk paket free
 * (hanya menghitung paket yang bukan premium bawaan dan belum dibeli)
 */
export async function getFreeCatAttemptsUsed(userId) {
  // Ambil semua attempt user
  const { data, error } = await supabase
    .from('user_cat_attempts')
    .select('cat_package_id, attempt_count')
    .eq('user_id', userId);

  if (error) return 0;

  // Ambil daftar premium package ids
  const premiumPackages = await getPremiumCatPackages();
  const premiumIds = premiumPackages.map(p => p.id);

  // Ambil daftar paket yang dibeli
  const { data: purchased } = await supabase
    .from('purchased_cat_packages')
    .select('package_id')
    .eq('user_id', userId);
  const purchasedIds = purchased?.map(p => p.package_id) || [];

  // Hitung attempt untuk paket yang bukan premium bawaan dan belum dibeli
  let total = 0;
  data?.forEach(item => {
    if (!premiumIds.includes(item.cat_package_id) && !purchasedIds.includes(item.cat_package_id)) {
      total += item.attempt_count;
    }
  });
  return total;
}

/**
 * Cek apakah user dapat mengakses paket CAT tertentu
 */
export async function canAccessCat(userId, packageId) {
  const prem = await isPremium(userId);

  // Jika premium, cek apakah paket ini termasuk premium bawaan
  if (prem) {
    const { data } = await supabase
      .from('exam_packages')
      .select('is_premium_cat')
      .eq('id', packageId)
      .single();
    if (data?.is_premium_cat) return true;
  }

  // Cek apakah paket sudah dibeli
  const { data: purchased } = await supabase
    .from('purchased_cat_packages')
    .select('package_id')
    .eq('user_id', userId)
    .eq('package_id', packageId)
    .maybeSingle();
  if (purchased) return true;

  // Jika belum premium dan belum dibeli, cek kuota free
  const usedAttempts = await getFreeCatAttemptsUsed(userId);
  if (usedAttempts >= FREE_CAT_ATTEMPTS_LIMIT) return false;

  // Cek apakah user sudah menggunakan paket ini (jika sudah, hitung attempt)
  const { data: attemptData } = await supabase
    .from('user_cat_attempts')
    .select('attempt_count')
    .eq('user_id', userId)
    .eq('cat_package_id', packageId)
    .maybeSingle();

  const currentAttempt = attemptData?.attempt_count || 0;
  // Total attempt untuk semua paket free yang sudah digunakan termasuk yang ini jika diakses
  // Kita harus hitung ulang: jika user akan mengakses paket ini, total attempt = usedAttempts + 1 (jika attempt sebelumnya 0)
  // Tetapi lebih sederhana: kita batasi total attempt < 5 dan jumlah paket yang diakses <= 2
  // Di sini kita hanya cek total attempt
  if (usedAttempts >= FREE_CAT_ATTEMPTS_LIMIT) return false;

  // Cek apakah user sudah menggunakan lebih dari FREE_CAT_PACKAGES_LIMIT paket free
  // Kita perlu menghitung jumlah paket free yang sudah digunakan (unique)
  const { data: freePackagesUsed } = await supabase
    .from('user_cat_attempts')
    .select('cat_package_id')
    .eq('user_id', userId)
    .gt('attempt_count', 0);

  const premiumIds = (await getPremiumCatPackages()).map(p => p.id);
  const purchasedIds = (await supabase.from('purchased_cat_packages').select('package_id').eq('user_id', userId)).data?.map(p => p.package_id) || [];

  const uniqueFreePackages = freePackagesUsed?.filter(item => {
    // filter hanya yang bukan premium dan belum dibeli
    return !premiumIds.includes(item.cat_package_id) && !purchasedIds.includes(item.cat_package_id);
  }) || [];

  if (uniqueFreePackages.length >= FREE_CAT_PACKAGES_LIMIT) {
    // Jika sudah mencapai 2 paket, cek apakah paket ini salah satu dari yang sudah digunakan
    const alreadyUsed = uniqueFreePackages.some(p => p.cat_package_id === packageId);
    if (!alreadyUsed) return false;
  }

  return true;
}

/**
 * Catat attempt CAT (panggil saat user memulai CAT)
 */
export async function recordCatAttempt(userId, packageId) {
  // Cek apakah ini paket premium bawaan atau sudah dibeli, jika iya tidak perlu dicatat (unlimited)
  const prem = await isPremium(userId);
  const { data: pkg } = await supabase
    .from('exam_packages')
    .select('is_premium_cat')
    .eq('id', packageId)
    .single();

  if (prem && pkg?.is_premium_cat) return; // tidak perlu catat

  const { data: purchased } = await supabase
    .from('purchased_cat_packages')
    .select('package_id')
    .eq('user_id', userId)
    .eq('package_id', packageId)
    .maybeSingle();
  if (purchased) return;

  // Upsert attempt
  const { data: existing } = await supabase
    .from('user_cat_attempts')
    .select('id, attempt_count')
    .eq('user_id', userId)
    .eq('cat_package_id', packageId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_cat_attempts')
      .update({ attempt_count: existing.attempt_count + 1, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('user_cat_attempts')
      .insert({ user_id: userId, cat_package_id: packageId, attempt_count: 1 });
  }
}

/**
 * Upgrade user ke premium
 * durationDays: durasi dalam hari (default 365)
 */
export async function upgradeToPremium(userId, durationDays = 365) {
  const now = new Date();
  const until = new Date(now);
  until.setDate(until.getDate() + durationDays);

  const { data: existing } = await supabase
    .from('user_premium')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Perpanjang jika sudah ada
    const { error } = await supabase
      .from('user_premium')
      .update({ is_premium: true, premium_until: until.toISOString(), updated_at: now.toISOString() })
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_premium')
      .insert({ user_id: userId, is_premium: true, premium_until: until.toISOString() });
    if (error) throw error;
  }
  return { success: true };
}

/**
 * Beli paket CAT terpisah
 */
export async function purchaseCatPackage(userId, packageId) {
  // Cek apakah sudah dibeli
  const { data: existing } = await supabase
    .from('purchased_cat_packages')
    .select('id')
    .eq('user_id', userId)
    .eq('package_id', packageId)
    .maybeSingle();

  if (existing) throw new Error('Paket sudah dibeli');

  const { error } = await supabase
    .from('purchased_cat_packages')
    .insert({ user_id: userId, package_id: packageId });

  if (error) throw error;
  return { success: true };
}
