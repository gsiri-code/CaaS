import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, DM_Mono } from "next/font/google";
import { resolveUserKey } from "@/lib/session";
import BottomNav from "./components/bottom-nav";
import UserSwitcher from "./components/user-switcher";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "CaaS — Closet as a Service",
  description: "Plaid for closets: passive wardrobe ingestion + P2P rental agents.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeUserKey = await resolveUserKey();

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${playfair.variable} ${dmMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-1 pb-24">
          {children}
        </div>
        <UserSwitcher activeUserKey={activeUserKey} />
        <BottomNav />
      </body>
    </html>
  );
}
