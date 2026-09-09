export function DbLoadError({
  title = "Could not load data",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-rose-800/90">{message}</p>
    </div>
  );
}
