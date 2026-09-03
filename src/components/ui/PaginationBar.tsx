"use client";

import { PAGE_SIZES, pageNumbers, type PageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export function PaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  from,
  to,
  pageCount,
}: {
  total: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  from: number;
  to: number;
  pageCount: number;
}) {
  if (total === 0) return null;

  const pages = pageNumbers(page, pageCount);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-medium text-slate-700">Rows</span>
        <div className="flex overflow-hidden rounded-md border border-slate-300 bg-white">
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onPageSizeChange(size)}
              className={cn(
                "px-2.5 py-1.5 text-xs font-semibold tabular-nums",
                pageSize === size
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              {size}
            </button>
          ))}
        </div>
        <span className="tabular-nums text-slate-500">
          {from}–{to} of {total}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {pages.map((item, i) =>
          item === "…" ? (
            <span
              key={`e-${i}`}
              className="px-1.5 text-xs text-slate-400"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={cn(
                "min-w-8 rounded-md px-2.5 py-1.5 text-xs font-semibold tabular-nums",
                item === page
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              )}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
