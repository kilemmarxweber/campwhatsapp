/** Résultat d’action serveur — jamais de throw pour une erreur métier. */
export type ActionOk = { ok: true };
export type ActionOkData<T> = { ok: true; data: T };
export type ActionFail = { ok: false; message: string };
export type ActionResult<T = void> = T extends void
  ? ActionOk | ActionFail
  : ActionOkData<T> | ActionFail;

export function actionOk(): ActionOk;
export function actionOk<T>(data: T): ActionOkData<T>;
export function actionOk<T>(data?: T): ActionOk | ActionOkData<T> {
  if (arguments.length === 0) return { ok: true };
  return { ok: true, data: data as T };
}

export function actionFail(message: string): ActionFail {
  return { ok: false, message };
}

type PrismaLikeError = {
  code?: string;
  meta?: { target?: string | string[] };
  message?: string;
};

function prismaCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const code = (err as PrismaLikeError).code;
  return typeof code === "string" ? code : null;
}

function prismaTargets(err: unknown): string[] {
  if (!err || typeof err !== "object") return [];
  const target = (err as PrismaLikeError).meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return [];
}

/** Message français pour contraintes Prisma / erreurs métier connues. */
export function prismaActionMessage(
  err: unknown,
  fallback = "Enregistrement impossible",
): string {
  const code = prismaCode(err);
  const targets = prismaTargets(err).join(" ").toLowerCase();

  if (code === "P2002") {
    if (targets.includes("phone") || targets.includes("organizationid_phone")) {
      return "Ce contact existe déjà (même numéro).";
    }
    if (targets.includes("email")) {
      return "Cet email est déjà utilisé.";
    }
    if (targets.includes("slug")) {
      return "Ce slug est déjà utilisé.";
    }
    if (targets.includes("name")) {
      return "Ce nom est déjà utilisé.";
    }
    return "Cet enregistrement existe déjà.";
  }

  if (code === "P2025") {
    return "Élément introuvable. Actualisez la page.";
  }

  if (err instanceof Error) {
    const msg = err.message.trim();
    if (
      msg &&
      !/minified react error|#\d+|digest|prisma|invocation/i.test(msg)
    ) {
      return msg;
    }
  }

  return fallback;
}

export function isActionFail(result: { ok: boolean }): result is ActionFail {
  return !result.ok;
}
