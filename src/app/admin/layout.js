import './globals.css';

export const metadata = {
  title: 'PlaySKD Admin',
  description: 'Panel admin untuk mengelola aplikasi PlaySKD',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
