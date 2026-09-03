import { MemberForm } from "@/components/members/MemberForm";

export default function NewMemberPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <MemberForm mode="create" />
    </div>
  );
}
