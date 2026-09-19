import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

export function getPageSize() {
  return PAGE_SIZE;
}

function pageHref(basePath: string, page: number) {
  if (page <= 1) return basePath;
  return `${basePath}?page=${page}`;
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

export function TablePagination({
  basePath,
  page,
  totalItems,
  pageSize = PAGE_SIZE,
  label = "éléments",
}: {
  basePath: string;
  page: number;
  totalItems: number;
  pageSize?: number;
  label?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);

  if (totalItems === 0) return null;

  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, totalItems);
  const pages = pageWindow(current, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--fg-muted)]">
        <span className="font-medium text-[var(--fg)]">
          {from}–{to}
        </span>{" "}
        sur {totalItems} {label}
      </p>

      <nav
        className="flex items-center gap-1"
        aria-label="Pagination"
      >
        <Link
          href={pageHref(basePath, current - 1)}
          aria-disabled={current <= 1}
          tabIndex={current <= 1 ? -1 : undefined}
          className={`btn btn-ghost !px-2 !py-2 ${
            current <= 1 ? "pointer-events-none opacity-40" : ""
          }`}
          aria-label="Page précédente"
        >
          <ChevronLeft className="size-4" />
        </Link>

        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1.5 text-sm text-[var(--fg-muted)]"
            >
              …
            </span>
          ) : (
            <Link
              key={p}
              href={pageHref(basePath, p)}
              aria-current={p === current ? "page" : undefined}
              className={
                p === current
                  ? "inline-flex size-9 items-center justify-center rounded-lg bg-[var(--tvs-blue)] text-sm font-semibold text-white shadow-sm"
                  : "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium text-[var(--fg)] transition-colors hover:bg-[var(--tvs-blue-soft)] hover:text-[var(--tvs-blue)]"
              }
            >
              {p}
            </Link>
          ),
        )}

        <Link
          href={pageHref(basePath, current + 1)}
          aria-disabled={current >= totalPages}
          tabIndex={current >= totalPages ? -1 : undefined}
          className={`btn btn-ghost !px-2 !py-2 ${
            current >= totalPages ? "pointer-events-none opacity-40" : ""
          }`}
          aria-label="Page suivante"
        >
          <ChevronRight className="size-4" />
        </Link>
      </nav>
    </div>
  );
}

export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
