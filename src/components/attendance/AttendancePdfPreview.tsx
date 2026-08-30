"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import {
  downloadPdfFile,
  type AttendancePdfFile,
} from "@/lib/attendance/pdf";

export function AttendancePdfPreview({
  file,
  onClose,
}: {
  file: AttendancePdfFile | null;
  onClose: () => void;
}) {
  useEffect(() => {
    return () => {
      if (file?.url) URL.revokeObjectURL(file.url);
    };
  }, [file]);

  return (
    <Dialog.Root
      open={!!file}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:inset-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <Dialog.Title className="text-base font-semibold text-slate-900">
                Attendance PDF preview
              </Dialog.Title>
              <Dialog.Description className="text-xs text-slate-500">
                {file?.filename}
              </Dialog.Description>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                type="button"
                disabled={!file}
                onClick={() => {
                  if (file) downloadPdfFile(file);
                }}
              >
                Download PDF
              </Button>
            </div>
          </div>
          {file ? (
            <iframe
              title="Attendance PDF preview"
              src={file.url}
              className="min-h-0 flex-1 bg-slate-100"
            />
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
