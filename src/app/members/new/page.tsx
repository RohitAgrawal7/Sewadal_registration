import { MemberForm } from "@/components/members/MemberForm";

export default function NewMemberPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Register new member
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete all sections below. Required fields are marked with *.
        </p>
      </div>
      <MemberForm mode="create" />
    </div>
  );
}
