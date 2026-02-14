export const metadata = {
  title: 'Silver Key Realty API',
  description: 'Silver Key Realty Platform API — Powered by QUAM Core',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
