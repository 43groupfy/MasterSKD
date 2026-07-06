import Link from "next/link";
import Navbar from "../components/Navbar";

export default function Home() {
  const features = [
    { emoji: "🎯", title: "110 Soal Resmi", desc: "TWK, TIU, dan TKP sesuai standar CASN terbaru" },
    { emoji: "⏱️", title: "Timer 100 Menit", desc: "Simulasi waktu ujian sesungguhnya persis seperti asli" },
    { emoji: "📊", title: "Pembahasan Lengkap", desc: "Setiap soal dilengkapi penjelasan jawaban yang detail" },
    { emoji: "⚡", title: "Sistem EXP & Level", desc: "Kumpulkan EXP di setiap sesi latihan dan naik level" },
  ];

  return (
    <>
      <Navbar />
      {/* HERO */}
      <section style={{ background: "var(--white)", borderBottom: "2px solid var(--gray-100)", padding: "72px 0 80px" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <span style={{ fontSize: "5rem", display: "block", marginBottom: "24px", animation: "bounce 2s infinite" }}>🦉</span>
          <div className="pill pill--green" style={{ margin: "0 auto 20px", width: "fit-content" }}>✨ Platform Simulasi SKD #1</div>
          <h1 style={{ maxWidth: "640px", margin: "0 auto 20px" }}>
            Siap Lulus CASN?{" "}
            <span style={{ color: "var(--green)" }}>Latihan Tiap Hari!</span>
          </h1>
          <p style={{ fontSize: "1.15rem", color: "var(--gray-500)", maxWidth: "480px", margin: "0 auto 40px" }}>
            Latih kemampuan TWK, TIU, dan TKP dengan cara yang seru dan terstruktur — seperti bermain game!
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" className="btn btn--ghost btn--lg">Masuk ke Akun</Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "64px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ marginBottom: "10px" }}>Kenapa PlaySKD?</h2>
            <p>Dirancang untuk cara belajar yang efektif dan menyenangkan</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {features.map((f, i) => (
              <div key={i} className="card" style={{ textAlign: "center", padding: "28px 20px" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "14px" }}>{f.emoji}</div>
                <h4 style={{ marginBottom: "8px" }}>{f.title}</h4>
                <p style={{ fontSize: "0.88rem", color: "var(--gray-500)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 0", textAlign: "center", background: "var(--white)", borderTop: "2px solid var(--gray-100)" }}>
        <div className="container" style={{ maxWidth: "500px" }}>
          <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🎓</div>
          <h2 style={{ marginBottom: "14px" }}>Mulai Belajar Sekarang</h2>
          <p style={{ marginBottom: "32px" }}>Daftar gratis, akses semua soal, dan pantau progresmu setiap saat.</p>
          <Link href="/login" className="btn btn--primary btn--lg" style={{ display: "inline-flex" }}>
            Daftar Gratis 🚀
          </Link>
        </div>
      </section>

      <footer style={{ background: "var(--gray-900)", color: "var(--gray-300)", textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--white)", marginBottom: "8px" }}>🦉 PlaySKD</div>
        <p style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>© 2026 PlaySKD · Platform Simulasi SKD CASN</p>
      </footer>
    </>
  );
}
