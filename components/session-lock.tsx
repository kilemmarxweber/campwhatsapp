"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { LockKeyholeIcon } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import {
  SESSION_IDLE_MS,
  SESSION_LOCK_OPEN_EVENT,
  clearSessionLockSnapshot,
  readLastSessionIdentity,
  readSessionLockSnapshot,
  rememberSessionIdentity,
  writeSessionLockSnapshot,
  type SessionLockSnapshot,
} from "@/lib/session-lock-storage";
import { Button } from "@/components/ui/button";

function isIdleSkipPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api")
  );
}

type SessionLockProps = {
  /** Forcer le popup (ex. session côté serveur absente). */
  forceLocked?: boolean;
};

/**
 * Soft-lock : popup mot de passe après inactivité.
 * La page courante reste sous le dialogue ; pas de redirect login.
 */
export function SessionLock({ forceLocked = false }: SessionLockProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const skipIdle = isIdleSkipPath(pathname);
  const { data: session } = useSession();
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [snapshot, setSnapshot] = useState<SessionLockSnapshot | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPendingUnlock, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);
  const lastIdentityRef = useRef<SessionLockSnapshot | null>(null);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    const email = session?.user?.email?.trim();
    if (!email || !session) return;
    const identity: SessionLockSnapshot = {
      email,
      returnPath: pathname || null,
    };
    lastIdentityRef.current = identity;
    rememberSessionIdentity(identity);
  }, [session, pathname]);

  function applyLock(next: SessionLockSnapshot) {
    writeSessionLockSnapshot(next);
    lockedRef.current = true;
    setSnapshot(next);
    setPassword("");
    setError(null);
    setLocked(true);
  }

  useEffect(() => {
    if (!skipIdle) {
      const existing = readSessionLockSnapshot();
      if (existing?.email) {
        applyLock(existing);
      } else if (forceLocked) {
        const next = lastIdentityRef.current ?? readLastSessionIdentity();
        if (next?.email) applyLock(next);
      }
    }
    setReady(true);
  }, [skipIdle, forceLocked]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      if (skipIdle) return;
      const detail = (event as CustomEvent<SessionLockSnapshot>).detail;
      const next = detail?.email ? detail : readSessionLockSnapshot();
      if (!next?.email) return;
      applyLock(next);
    };
    window.addEventListener(SESSION_LOCK_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SESSION_LOCK_OPEN_EVENT, onOpen);
  }, [skipIdle]);

  useEffect(() => {
    if (!locked || skipIdle) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked, skipIdle]);

  useEffect(() => {
    const email = session?.user?.email;
    if (!ready || !email || !session || locked || skipIdle) return;

    const arm = () => {
      if (lockedRef.current) return;
      if (document.querySelector('[data-idle-logout="off"]')) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        if (document.querySelector('[data-idle-logout="off"]')) return;
        applyLock({
          email,
          returnPath: window.location.pathname + window.location.search,
        });
      }, SESSION_IDLE_MS);
    };

    let lastArm = 0;
    const onActivity = () => {
      if (lockedRef.current) return;
      const now = Date.now();
      if (now - lastArm < 1000) return;
      lastArm = now;
      arm();
    };

    const events = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ] as const;

    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    arm();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [session, locked, ready, skipIdle]);

  function unlock() {
    clearSessionLockSnapshot();
    lockedRef.current = false;
    setLocked(false);
    setSnapshot(null);
    setPassword("");
    setError(null);
  }

  function handleUnlockSubmit(event: FormEvent) {
    event.preventDefault();
    if (!snapshot?.email || !password.trim()) {
      setError("Saisissez votre mot de passe.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const { error: signInError } = await authClient.signIn.email({
        email: snapshot.email,
        password,
      });

      if (signInError) {
        setError(
          signInError.message ??
            "Mot de passe incorrect. Vérifiez et réessayez.",
        );
        return;
      }

      await authClient.getSession();
      unlock();
      const target = snapshot.returnPath?.trim();
      if (target && target !== pathname) {
        router.replace(target);
      }
      router.refresh();
    });
  }

  async function handleSignOut() {
    clearSessionLockSnapshot();
    try {
      await authClient.signOut();
    } catch {
      // redirect anyway
    }
    window.location.href = "/auth/sign-in";
  }

  if (!ready || skipIdle || !locked) return null;

  return (
    <div
      className="session-lock-overlay"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-lock-title"
        aria-describedby="session-lock-desc"
        className="session-lock-dialog"
      >
        <div className="session-lock-header">
          <span className="session-lock-icon" aria-hidden>
            <LockKeyholeIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="session-lock-title" className="session-lock-title">
              Session verrouillée
            </h2>
            <p id="session-lock-desc" className="session-lock-desc">
              Inactivité détectée. Entrez votre mot de passe pour revenir à
              votre page en cours.
            </p>
          </div>
        </div>

        <form onSubmit={handleUnlockSubmit} className="session-lock-form">
          {snapshot?.email ? (
            <p className="session-lock-email">{snapshot.email}</p>
          ) : null}

          <div className="field field-sm">
            <label htmlFor="session-lock-password">
              Mot de passe
              <span className="field-required" aria-hidden>
                {" "}
                *
              </span>
            </label>
            <input
              id="session-lock-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPendingUnlock}
              placeholder="Votre mot de passe"
            />
          </div>

          {error ? (
            <p className="session-lock-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="session-lock-actions">
            <Button
              type="button"
              variant="destructive"
              className="h-10"
              disabled={isPendingUnlock}
              onClick={() => void handleSignOut()}
            >
              Se déconnecter
            </Button>
            <Button
              type="submit"
              className="h-10"
              disabled={isPendingUnlock || !password.trim()}
            >
              {isPendingUnlock ? "Vérification…" : "Continuer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
