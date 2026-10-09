"use client";

import {
  useEffect,
  useState,
  useTransition,
  useSyncExternalStore,
  type TransitionStartFunction,
} from "react";
import { createPortal } from "react-dom";

export function LoaderCircle({ className = "size-10" }: { className?: string }) {
  return (
    <span
      className={`animate-spin rounded-full border-[3px] border-[var(--border)] border-t-[var(--tvs-blue)] ${className}`}
      aria-hidden
    />
  );
}

export function PageLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderCircle />
      <span className="text-sm text-[var(--fg-muted)]">{label}</span>
    </div>
  );
}

type PendingSnapshot = { count: number; label: string };

let pendingCount = 0;
let pendingLabel = "Chargement…";
let pendingSnapshot: PendingSnapshot = { count: 0, label: "Chargement…" };
const SERVER_PENDING_SNAPSHOT: PendingSnapshot = {
  count: 0,
  label: "Chargement…",
};
const pendingListeners = new Set<() => void>();

function emitPending() {
  pendingSnapshot = { count: pendingCount, label: pendingLabel };
  for (const listener of pendingListeners) listener();
}

function subscribePending(listener: () => void) {
  pendingListeners.add(listener);
  return () => {
    pendingListeners.delete(listener);
  };
}

function getPendingSnapshot(): PendingSnapshot {
  return pendingSnapshot;
}

function getServerPendingSnapshot(): PendingSnapshot {
  return SERVER_PENDING_SNAPSHOT;
}

function beginGlobalPending(label: string) {
  pendingCount += 1;
  pendingLabel = label;
  emitPending();
}

function endGlobalPending() {
  pendingCount = Math.max(0, pendingCount - 1);
  if (pendingCount === 0) pendingLabel = "Chargement…";
  emitPending();
}

/** Overlay plein écran pendant ajout / modification / actions. */
export function PendingOverlay({
  show,
  label = "Chargement…",
}: {
  show: boolean;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [show]);

  if (!show || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-[color-mix(in_oklab,var(--background)_72%,transparent)] backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderCircle className="size-12" />
      <span className="text-sm font-medium text-[var(--fg-muted)]">{label}</span>
    </div>,
    document.body,
  );
}

/** Hôte unique — à monter une fois dans le layout racine. */
export function GlobalPendingOverlayHost() {
  const snapshot = useSyncExternalStore(
    subscribePending,
    getPendingSnapshot,
    getServerPendingSnapshot,
  );
  return <PendingOverlay show={snapshot.count > 0} label={snapshot.label} />;
}

export function usePendingOverlay(label = "Chargement…"): {
  pending: boolean;
  startTransition: TransitionStartFunction;
  /** Conservé pour compat — l’overlay global s’affiche déjà automatiquement. */
  overlay: null;
} {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!pending) return;
    beginGlobalPending(label);
    return () => {
      endGlobalPending();
    };
  }, [pending, label]);

  return {
    pending,
    startTransition,
    overlay: null,
  };
}
