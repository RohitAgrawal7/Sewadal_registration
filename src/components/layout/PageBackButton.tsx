"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { safeReturnPath } from "@/lib/return-path";

function parentPath(pathname: string): string | null {
  if (pathname === "/") return null;
  if (pathname === "/lists" || pathname === "/attendance") return "/";
  if (pathname === "/members/new") return "/lists";
  if (pathname.startsWith("/members/")) return "/lists";

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "lists") {
    if (parts.length >= 3) return `/lists/${parts[1]}`;
    if (parts.length === 2) return "/lists";
  }

  return "/";
}

export function PageBackButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const href = safeReturnPath(searchParams.get("from")) ?? parentPath(pathname);

  if (!href) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => router.push(href)}
    >
      ← Back
    </Button>
  );
}
