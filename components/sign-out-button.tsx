"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Déconnexion
    </button>
  );
}
