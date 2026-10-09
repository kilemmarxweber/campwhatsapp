"use server";

import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
import prisma from "@/lib/prisma";

export async function completeFirstLoginPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  callbackUrl?: string | null;
}): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword.trim();
  const confirmPassword = input.confirmPassword;
  if (!currentPassword) {
    return { ok: false, message: "Le mot de passe temporaire est requis." };
  }
  if (newPassword.length < 6) {
    return { ok: false, message: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, message: "Les mots de passe ne correspondent pas." };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { ok: false, message: "Reconnectez-vous pour continuer." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  if (!user?.mustChangePassword) {
    return { ok: false, message: "Aucun changement de mot de passe n'est requis." };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      const code = String(error.body?.code ?? "");
      if (code === "INVALID_PASSWORD") {
        return { ok: false, message: "Mot de passe temporaire incorrect." };
      }
      return {
        ok: false,
        message: error.message || "Impossible d'enregistrer le mot de passe.",
      };
    }
    return { ok: false, message: "Impossible d'enregistrer le mot de passe." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mustChangePassword: false },
  });

  const path = await resolvePostLoginPath(
    session.user.id,
    session.user.role,
    input.callbackUrl,
  );
  return { ok: true, path };
}
