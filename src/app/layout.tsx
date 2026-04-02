import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "铃华2026 · 校外研修｜成员关系一览",
  description:
    "铃华2026 校外研修用的成员关系图：像在读剧本一样，把大家的人设和彼此的看法、经历连成一张网。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSerif.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="relative min-h-full">{children}</body>
    </html>
  );
}
