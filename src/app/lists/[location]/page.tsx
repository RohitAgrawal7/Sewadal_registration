import { notFound } from "next/navigation";
import { getAllMembers } from "@/lib/members/queries";
import { orgSettings } from "@/lib/org-settings";
import { ListsLocationLive } from "@/components/lists/ListsLiveViews";

export const dynamic = "force-dynamic";

export default async function ListsLocationPage({
  params,
}: {
  params: { location: string };
}) {
  if (params.location !== orgSettings.locationSlug) notFound();
  const members = await getAllMembers();
  return <ListsLocationLive initialMembers={members} />;
}
