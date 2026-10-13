"use client";

import { toast } from "sonner";
import type { ActionFail } from "@/lib/action-result";
import { prismaActionMessage } from "@/lib/action-result";

function isSystemErrorMessage(message: string) {
  return /minified react error|#\d+|digest|prisma\.|invocation/i.test(message);
}

/** Affiche le message métier d’une action, jamais l’erreur React #441. */
export function toastActionFail(
  result: ActionFail,
  fallback = "Action impossible",
) {
  const message = result.message?.trim();
  toast.error(
    message && !isSystemErrorMessage(message) ? message : fallback,
  );
}

export function toastCaughtError(
  err: unknown,
  fallback = "Une erreur est survenue",
) {
  toast.error(prismaActionMessage(err, fallback));
}
