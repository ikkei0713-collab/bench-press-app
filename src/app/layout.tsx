import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bench Press 100kg Program",
  description: "ベンチプレス100kgを目指す12週間プログラム管理アプリ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bench100",
  },
};

export const viewport: Viewport = {
  themeColor: "#16181d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
