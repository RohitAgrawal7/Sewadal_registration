/** Only allow same-app paths so `from` cannot send users off-site. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function memberHref(id: string, from?: string | null, edit = false) {
  const params = new URLSearchParams();
  if (edit) params.set("edit", "1");
  const safeFrom = safeReturnPath(from);
  if (safeFrom) params.set("from", safeFrom);
  const qs = params.toString();
  return qs ? `/members/${id}?${qs}` : `/members/${id}`;
}
