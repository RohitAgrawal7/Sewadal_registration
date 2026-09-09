import { notFound } from "next/navigation";
import { getAllMembers } from "@/lib/members/queries";
import { orgSettings } from "@/lib/org-settings";
import type { Unit } from "@/lib/enums";
import { UNITS } from "@/lib/enums";
import { ListsUnitLive } from "@/components/lists/ListsLiveViews";
import { DbLoadError } from "@/components/ui/DbLoadError";
import { publicDbError } from "@/lib/db/helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ListsUnitMembersPage({
  params,
}: {
  params: { location: string; unit: string };
}) {
  if (params.location !== orgSettings.locationSlug) notFound();
  if (!(UNITS as string[]).includes(params.unit)) notFound();

  try {
    const members = await getAllMembers();
    return (
      <ListsUnitLive initialMembers={members} unit={params.unit as Unit} />
    );
  } catch (error) {
    console.error("Lists unit page data failed", error);
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <DbLoadError
          title="Unit list could not load"
          message={publicDbError(error, "Could not load members")}
        />
      </div>
    );
  }
}
