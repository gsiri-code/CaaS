import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import Link from "next/link";
import BottomNav from "./components/bottom-nav";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
      className={`${outfit.variable} ${cormorant.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-1 pb-24">
          {children}
        </div>
        <div className="fixed top-3 right-3 flex gap-1.5 text-[11px] z-50">
          <Link
            href="/?as=alice"
            className="px-2.5 py-1 rounded-full backdrop-blur-md bg-white/60 text-[var(--muted)] no-underline border border-[var(--border)] hover:bg-white/80 transition-colors"
          >
            Alice
          </Link>
          <Link
            href="/?as=bob"
            className="px-2.5 py-1 rounded-full backdrop-blur-md bg-white/60 text-[var(--muted)] no-underline border border-[var(--border)] hover:bg-white/80 transition-colors"
          >
            Bob
          </Link>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
