import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

export function Avatar({
  photoUrl,
  name,
  size = "md",
  className,
}: {
  photoUrl?: string | null;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={cn(
          "rounded-full object-cover bg-slate-200",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600",
        sizes[size],
        className
      )}
      aria-label={name}
    >
      {initials(name) || "?"}
    </span>
  );
}
