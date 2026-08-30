"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UNIT_LABELS } from "@/lib/unit-colors";
import type { Unit } from "@/lib/enums";

export function UnitReassignDialog({
  open,
  onOpenChange,
  memberName,
  fromUnit,
  toUnit,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  fromUnit: Unit | string;
  toUnit: Unit | string;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}) {
  const fromLabel = UNIT_LABELS[fromUnit as Unit] ?? fromUnit;
  const toLabel = UNIT_LABELS[toUnit as Unit] ?? toUnit;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm unit reassignment"
      description={
        <>
          Move <strong>{memberName}</strong> from {fromLabel} to {toLabel}? This
          closes the current unit assignment and starts a new log entry so
          tenure-per-unit stays accurate.
        </>
      }
      confirmLabel="Move member"
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}
