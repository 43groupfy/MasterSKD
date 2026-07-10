import "./globals.css";

export const metadata = {
  title: "PlaySKD — Latihan SKD CASN",
  description: "Platform simulasi SKD CASN terbaik. Latihan TWK, TIU, TKP dengan gamifikasi.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
