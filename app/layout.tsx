import type { Metadata } from "next";
import { Barlow, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const display = Barlow({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TVS Motors — Campagnes WhatsApp",
  description:
    "Campagnes WhatsApp TVS R.D. Congo — messages, images et vidéos via Klambo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${display.variable} ${mono.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <Toaster theme="light" richColors position="top-right" />
      </body>
    </html>
  );
}
