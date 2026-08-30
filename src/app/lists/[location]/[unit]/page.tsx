import { notFound } from "next/navigation";
import { getAllMembers } from "@/lib/members/queries";
import { orgSettings } from "@/lib/org-settings";
import type { Unit } from "@/lib/enums";
import { UNITS } from "@/lib/enums";
import { ListsUnitLive } from "@/components/lists/ListsLiveViews";

export const dynamic = "force-dynamic";

export default async function ListsUnitMembersPage({
  params,
}: {
  params: { location: string; unit: string };
}) {
  if (params.location !== orgSettings.locationSlug) notFound();
  if (!(UNITS as string[]).includes(params.unit)) notFound();

  const members = await getAllMembers();
  return (
    <ListsUnitLive initialMembers={members} unit={params.unit as Unit} />
  );
}
