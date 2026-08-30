import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getMemberById } from "@/lib/members/queries";
import { MemberProfileClient } from "@/components/members/MemberProfileClient";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
}: {
  params: { id: string };
}) {
  const member = await getMemberById(params.id);
  if (!member) notFound();

  return (
    <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading…</p>}>
      <MemberProfileClient member={member} />
    </Suspense>
  );
}
