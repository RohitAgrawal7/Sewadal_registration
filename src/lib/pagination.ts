export const PAGE_SIZES = [20, 50, 75, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function parsePageSize(value: string | number | null | undefined): PageSize {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 50 || n === 75 || n === 100 || n === 20) return n;
  return 20;
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const current = Math.min(Math.max(1, page || 1), pageCount);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    total,
    pageCount,
    current,
    pageSize,
    start,
    slice,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
  };
}

export function pageNumbers(current: number, pageCount: number): Array<number | "…"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(pageCount - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < pageCount - 1) items.push("…");
  items.push(pageCount);
  return items;
}
