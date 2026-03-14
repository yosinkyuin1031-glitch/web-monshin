import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WEB問診票",
  description: "整体院・鍼灸院向けWEB問診システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
