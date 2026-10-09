import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

export function getPageSize() {
  return PAGE_SIZE;
}

function pageHref(
  basePath: string,
  page: number,
  query?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      const trimmed = value?.trim();
      if (trimmed) params.set(key, trimmed);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("…");
    out.push(n);
  }
  return out;
}

const pageBtnBase =
  "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium text-[var(--fg)] transition-colors hover:bg-[var(--tvs-blue-soft)] hover:text-[var(--tvs-blue)]";
const pageBtnActive =
  "inline-flex size-9 items-center justify-center rounded-lg bg-[var(--tvs-blue)] text-sm font-semibold text-white shadow-sm";

export function TablePagination({
  basePath,
  page,
  totalItems,
  pageSize = PAGE_SIZE,
  label = "éléments",
  query,
  onPageChange,
}: {
  basePath: string;
  page: number;
  totalItems: number;
  pageSize?: number;
  label?: string;
  /** Extra query params to preserve across pages (e.g. search `q`). */
  query?: Record<string, string | undefined>;
  /** If set, pagination stays client-side (no full navigation). */
  onPageChange?: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);

  if (totalItems === 0) return null;

  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, totalItems);
  const pages = pageWindow(current, totalPages);

  function renderPrev() {
    const disabled = current <= 1;
    const className = `btn btn-ghost !px-2 !py-2 ${
      disabled ? "pointer-events-none opacity-40" : ""
    }`;
    if (onPageChange) {
      return (
        <button
          type="button"
          className={className}
          disabled={disabled}
          aria-label="Page précédente"
          onClick={() => onPageChange(current - 1)}
        >
          <ChevronLeft className="size-4" />
        </button>
      );
    }
    return (
      <Link
        href={pageHref(basePath, current - 1, query)}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        className={className}
        aria-label="Page précédente"
      >
        <ChevronLeft className="size-4" />
      </Link>
    );
  }

  function renderNext() {
    const disabled = current >= totalPages;
    const className = `btn btn-ghost !px-2 !py-2 ${
      disabled ? "pointer-events-none opacity-40" : ""
    }`;
    if (onPageChange) {
      return (
        <button
          type="button"
          className={className}
          disabled={disabled}
          aria-label="Page suivante"
          onClick={() => onPageChange(current + 1)}
        >
          <ChevronRight className="size-4" />
        </button>
      );
    }
    return (
      <Link
        href={pageHref(basePath, current + 1, query)}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        className={className}
        aria-label="Page suivante"
      >
        <ChevronRight className="size-4" />
      </Link>
    );
  }

  function renderPage(p: number) {
    const active = p === current;
    const className = active ? pageBtnActive : pageBtnBase;
    if (onPageChange) {
      return (
        <button
          key={p}
          type="button"
          className={className}
          aria-current={active ? "page" : undefined}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      );
    }
    return (
      <Link
        key={p}
        href={pageHref(basePath, p, query)}
        aria-current={active ? "page" : undefined}
        className={className}
      >
        {p}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--fg-muted)]">
        <span className="font-medium text-[var(--fg)]">
          {from}–{to}
        </span>{" "}
        sur {totalItems} {label}
      </p>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        {renderPrev()}
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1.5 text-sm text-[var(--fg-muted)]"
            >
              …
            </span>
          ) : (
            renderPage(p)
          ),
        )}
        {renderNext()}
      </nav>
    </div>
  );
}

export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
