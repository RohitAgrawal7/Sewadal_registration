"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import type { Member } from "@prisma/client";
import type { Unit } from "@/lib/enums";
import { MemberForm } from "@/components/members/MemberForm";
import { Button } from "@/components/ui/Button";
import { useOptionalMembersLive } from "@/components/members/MembersLiveContext";

export function AddMemberButton({
  defaultUnit,
}: {
  defaultUnit?: Unit;
}) {
  const router = useRouter();
  const live = useOptionalMembersLive();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add sewadaar
      </Button>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setFormKey((k) => k + 1);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content
            data-scroll-form
            className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(100%-1.5rem,52rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-slate-50 p-4 shadow-xl sm:p-6"
          >
            <div className="mb-3 flex justify-end">
              <Dialog.Title className="sr-only">New Sewadaar</Dialog.Title>
              <Dialog.Description className="sr-only">
                Register a new sewadaar. The form stays open after submit.
              </Dialog.Description>
              <Dialog.Close asChild>
                <Button type="button" variant="outline" size="sm">
                  Close
                </Button>
              </Dialog.Close>
            </div>
            <MemberForm
              key={formKey}
              mode="create"
              lockUnit={Boolean(defaultUnit)}
              defaultValues={defaultUnit ? { unit: defaultUnit } : undefined}
              onCancel={() => setOpen(false)}
              onCreated={async (_id, member) => {
                if (live && member) {
                  live.applyMember(member as Member);
                } else if (live) {
                  await live.reload();
                } else {
                  router.refresh();
                }
                setFormKey((k) => k + 1);
              }}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
