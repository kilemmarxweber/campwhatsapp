/** Soft-lock session après inactivité (inspiré Eteyelo). */

export const SESSION_LOCK_STORAGE_KEY = "tvs:session-lock";
export const SESSION_LAST_IDENTITY_KEY = "tvs:session-last-identity";

/** Inactivité avant verrouillage. */
export const SESSION_IDLE_MS = 15 * 60 * 1000;

export const SESSION_LOCK_OPEN_EVENT = "tvs:session-lock-open";

export type SessionLockSnapshot = {
  email: string;
  /** Chemin à conserver après déverrouillage. */
  returnPath: string | null;
};

export function readSessionLockSnapshot(): SessionLockSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionLockSnapshot;
    if (!parsed?.email?.trim()) return null;
    return {
      email: parsed.email.trim(),
      returnPath: parsed.returnPath ?? null,
    };
  } catch {
    return null;
  }
}

export function readLastSessionIdentity(): SessionLockSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_LAST_IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionLockSnapshot;
    if (!parsed?.email?.trim()) return null;
    return {
      email: parsed.email.trim(),
      returnPath: parsed.returnPath ?? null,
    };
  } catch {
    return null;
  }
}

export function rememberSessionIdentity(snapshot: SessionLockSnapshot) {
  if (typeof window === "undefined") return;
  if (!snapshot.email?.trim()) return;
  sessionStorage.setItem(
    SESSION_LAST_IDENTITY_KEY,
    JSON.stringify({
      email: snapshot.email.trim(),
      returnPath: snapshot.returnPath ?? null,
    }),
  );
}

export function writeSessionLockSnapshot(snapshot: SessionLockSnapshot) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_LOCK_STORAGE_KEY, JSON.stringify(snapshot));
  rememberSessionIdentity(snapshot);
}

export function clearSessionLockSnapshot() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_LOCK_STORAGE_KEY);
}

/**
 * Ouvre le soft-lock (popup) sans rediriger vers /auth/sign-in.
 * Retourne false si aucun email connu.
 */
export function requestSessionLock(partial?: {
  email?: string | null;
  returnPath?: string | null;
}): boolean {
  if (typeof window === "undefined") return false;

  const existing = readSessionLockSnapshot();
  const last = readLastSessionIdentity();
  const email = (
    partial?.email ??
    existing?.email ??
    last?.email ??
    ""
  ).trim();
  if (!email) return false;

  const snapshot: SessionLockSnapshot = {
    email,
    returnPath:
      partial?.returnPath ??
      existing?.returnPath ??
      last?.returnPath ??
      window.location.pathname,
  };

  writeSessionLockSnapshot(snapshot);
  window.dispatchEvent(
    new CustomEvent(SESSION_LOCK_OPEN_EVENT, { detail: snapshot }),
  );
  return true;
}
