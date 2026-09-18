import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, var(--tvs-blue) 0%, var(--tvs-blue) 55%, var(--tvs-red) 55%, var(--tvs-red) 100%)",
        }}
      />
      <p className="brand-mark mb-4 text-sm uppercase tracking-[0.18em]">
        <span className="tvs">TVS</span>
        <span className="motors">Motors</span>
      </p>
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-[var(--tvs-blue-deep)] sm:text-5xl">
        Campagnes WhatsApp
      </h1>
      <p className="mb-8 max-w-xl text-lg text-[var(--fg-muted)]">
        Distributeur exclusif TVS en R.D. Congo — créez des campagnes texte,
        image ou vidéo et envoyez-les à vos clients via KlamboWhatsapp.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/auth/sign-in" className="btn btn-primary">
          Se connecter
        </Link>
        <Link href="/auth/sign-up" className="btn btn-brand">
          Créer un compte
        </Link>
      </div>
      <p className="mt-10 text-sm text-[var(--fg-muted)]">
        <a
          href="https://www.tvsrdcongo.com/"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-[var(--tvs-red)] underline-offset-4 hover:text-[var(--tvs-blue)]"
        >
          tvsrdcongo.com
        </a>
      </p>
    </main>
  );
}
