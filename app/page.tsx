import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Campagnes — WhatsApp & SMS",
  description:
    "Plateforme d’envoi WhatsApp et SMS pour les succursales : contacts, templates, campagnes et rapports.",
};

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");

  return <LandingPage />;
}
