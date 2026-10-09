export function PageLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="size-10 animate-spin rounded-full border-[3px] border-[var(--border)] border-t-[var(--tvs-blue)]"
        aria-hidden
      />
      <span className="text-sm text-[var(--fg-muted)]">{label}</span>
    </div>
  );
}
