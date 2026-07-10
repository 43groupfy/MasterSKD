"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        setSuccess("Pendaftaran berhasil! Cek email untuk verifikasi, lalu login.");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="page-auth" style={{ background: "linear-gradient(160deg, var(--green-light) 0%, var(--white) 50%, var(--blue-light) 100%)" }}>
        <div className="container--narrow" style={{ width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🦉</div>
            <h2>{isLogin ? "Selamat Datang Kembali!" : "Buat Akun Baru"}</h2>
            <p style={{ color: "var(--gray-500)", marginTop: "6px" }}>
              {isLogin ? "Lanjutkan perjalanan belajarmu" : "Mulai petualangan belajarmu hari ini"}
            </p>
          </div>

          <div className="card card--raised" style={{ padding: "40px 36px" }}>
            {success && (
              <div style={{ background: "var(--green-light)", border: "2px solid var(--green)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "20px", color: "var(--green-dark)", fontSize: "0.9rem", fontWeight: 600 }}>
                ✅ {success}
              </div>
            )}
            {error && (
              <div style={{ background: "var(--red-light)", border: "2px solid var(--red)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "20px", color: "var(--red-dark)", fontSize: "0.9rem", fontWeight: 600 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAuth}>
              {!isLogin && (
                <div style={{ marginBottom: "20px" }}>
                  <label className="input-label">Nama Lengkap</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Nama kamu" />
                </div>
              )}
              <div style={{ marginBottom: "20px" }}>
                <label className="input-label">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="nama@email.com" />
              </div>
              <div style={{ marginBottom: "28px" }}>
                <label className="input-label">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Minimal 6 karakter" minLength={6} />
              </div>
              <button type="submit" disabled={loading} className="btn btn--primary btn--lg btn--block">
                {loading ? "Memproses..." : isLogin ? "Masuk Sekarang →" : "Daftar Gratis →"}
              </button>
            </form>

            <div className="divider-or">atau</div>
            <button onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }} className="btn btn--ghost btn--block">
              {isLogin ? "Belum punya akun? Daftar" : "Sudah punya akun? Login"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
