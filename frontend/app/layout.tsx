import "./globals.css";

export const metadata = {
  title: "SecureYield - Private Yield Calculator",
  description: "Privacy-First Investment Calculator Using FHEVM Technology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc' }}>{children}</body>
    </html>
  );
}

