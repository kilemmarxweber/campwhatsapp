import type { Metadata } from "next";
import { Barlow, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { GlobalPendingOverlayHost } from "@/components/page-loader";
import { SessionLock } from "@/components/session-lock";
import { cn } from "@/lib/utils";
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
  title: "Campagnes — WhatsApp & SMS",
  description:
    "Gérez vos campagnes WhatsApp et SMS multicanales — messages, images, vidéos et liens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn("h-full font-sans", display.variable, mono.variable)}
    >
      <body className="min-h-full antialiased">
        {children}
        <SessionLock />
        <GlobalPendingOverlayHost />
        <Toaster theme="light" richColors position="top-right" />
      </body>
    </html>
  );
}
