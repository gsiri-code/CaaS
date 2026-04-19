import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10 px-6 py-3 flex items-center gap-6 text-sm">
          <Link href="/" className="font-semibold">CaaS</Link>
          <nav className="flex gap-4 text-black/70 dark:text-white/70">
            <Link href="/ingest">Ingest</Link>
            <Link href="/closet">Closet</Link>
            <Link href="/wishlist">Wishlist</Link>
            <Link href="/negotiations">Negotiations</Link>
          </nav>
          <div className="ml-auto flex gap-2 text-xs">
            <Link href="/?as=alice" className="px-2 py-1 rounded bg-black/5 dark:bg-white/10">as Alice</Link>
            <Link href="/?as=bob" className="px-2 py-1 rounded bg-black/5 dark:bg-white/10">as Bob</Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
