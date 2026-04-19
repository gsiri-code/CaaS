import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import BottomNav from "./components/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CaaS — Closet as a Service",
  description: "Plaid for closets: passive wardrobe ingestion + P2P rental agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        <div className="flex-1 pb-24">
          {children}
        </div>
        <div className="fixed top-3 right-3 flex gap-1.5 text-[11px] z-50">
          <Link href="/?as=alice" className="px-2 py-1 rounded-full bg-black/5 text-black/60 no-underline">Alice</Link>
          <Link href="/?as=bob" className="px-2 py-1 rounded-full bg-black/5 text-black/60 no-underline">Bob</Link>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
