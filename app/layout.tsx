import type { Metadata } from "next";
import { Barlow, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { GlobalPendingOverlayHost } from "@/components/page-loader";
import { SessionLock } from "@/components/session-lock";
import { getSiteUrl, SITE } from "@/lib/site";
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
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.publisher }],
  creator: SITE.publisher,
  publisher: SITE.publisher,
  category: "business",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: "/",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={SITE.language}
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
