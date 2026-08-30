import { getAllMembers } from "@/lib/members/queries";
import { ListsIndexLive } from "@/components/lists/ListsLiveViews";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const members = await getAllMembers();
  return <ListsIndexLive initialMembers={members} />;
}
