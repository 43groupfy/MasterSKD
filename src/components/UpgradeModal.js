"use client";
import { useRouter } from "next/navigation";

const CONTENT = {
  materi: {
    emoji: "📚",
    title: "Kuota Latihan Gratis Habis",
    desc: "Kamu sudah mengerjakan ${FREE_QUESTION_LIMIT_TOTAL} soal gratis. Upgrade ke Premium untuk akses unlimited semua soal.",
  },
  cat_quota: {
    emoji: "🎯",
    title: "Kuota Simulasi CAT Gratis Habis",
    desc: "Kamu sudah menggunakan ${FREE_CAT_TOTAL_ATTEMPTS} percobaan CAT gratis. Upgrade ke Premium untuk simulasi CAT unlimited.",
  },
  cat_locked: {
    emoji: "🔒",
    title: "Paket CAT Premium",
    desc: "Paket simulasi ini termasuk dalam Premium dengan percobaan tanpa batas. Kamu juga bisa membeli paket ini secara terpisah tanpa berlangganan Premium.",
  },
  generic: {
    emoji: "⭐",
    title: "Buka Akses Penuh Play-SKD",
    desc: "Rasakan seluruh pengalaman belajar tanpa batas dengan Premium.",
  },
};

export default function UpgradeModal({ open, onClose, reason = "generic" }) {
  const router = useRouter();
  if (!open) return null;
  const c = CONTENT[reason] || CONTENT.generic;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>{c.emoji}</div>
        <h3 style={{ marginBottom: "8px" }}>{c.title}</h3>
        <p style={{ color: "var(--gray-500)", marginBottom: "20px", fontSize: "0.92rem", lineHeight: 1.6 }}>
          {c.desc}
        </p>

        <div
          style={{
            textAlign: "left",
            background: "var(--gray-50)",
            border: "2px solid var(--gray-200)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            marginBottom: "22px",
            fontSize: "0.85rem",
            color: "var(--gray-700)",
            lineHeight: 2,
          }}
        >
          <div>✅ Semua soal & materi terbuka, latihan unlimited</div>
          <div>✅ Paket simulasi CAT Premium, unlimited attempt</div>
          <div>✅ Update soal otomatis tersedia</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={() => router.push("/premium")} className="btn btn--yellow btn--block">
            ⭐ Lihat Paket Premium
          </button>
          <button onClick={onClose} className="btn btn--ghost btn--block">
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
