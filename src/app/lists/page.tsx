import { getAllMembers } from "@/lib/members/queries";
import { ListsIndexLive } from "@/components/lists/ListsLiveViews";
import { DbLoadError } from "@/components/ui/DbLoadError";
import { publicDbError } from "@/lib/db/helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function ListsPage() {
  try {
    const members = await getAllMembers();
    return <ListsIndexLive initialMembers={members} />;
  } catch (error) {
    console.error("Lists page data failed", error);
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <DbLoadError
          title="Lists data could not load"
          message={publicDbError(error, "Could not load members")}
        />
      </div>
    );
  }
}
