"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  memberFormSchema,
  type MemberFormValues,
  GENDER_LABELS,
  ID_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/validations/member";
import {
  GENDERS,
  MEMBERSHIP_STATUSES,
  NATIONAL_ID_TYPES,
  MembershipStatus,
  type Unit,
} from "@/lib/enums";
import { ALL_UNITS, UNIT_COLORS, UNIT_LABELS } from "@/lib/unit-colors";
import { orgSettings } from "@/lib/org-settings";
import { computeAge } from "@/lib/dates";
import { cn, formatDateInput, parseDateInput } from "@/lib/utils";
import { createMember, updateMember } from "@/lib/members/actions";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { UnitReassignDialog } from "@/components/members/UnitReassignDialog";

function todayIso() {
  return formatDateInput(new Date());
}

function emptyMemberValues(
  overrides?: Partial<MemberFormValues>
): MemberFormValues {
  return {
    fullName: "",
    preferredName: "",
    gender: null,
    dateOfBirth: "",
    nationalIdType: "NationalID",
    nationalIdNumber: "",
    photoUrl: "",
    email: "",
    phonePrimary: "",
    phoneSecondary: "",
    address: "",
    city: "",
    stateRegion: "",
    postalCode: "",
    country: orgSettings.defaultCountry,
    emergencyContactName: "",
    emergencyContactPhone: "",
    unit: "Unit1",
    unitAssignedDate: todayIso(),
    role: "",
    registrationDate: todayIso(),
    membershipStatus: MembershipStatus.Active,
    statusEffectiveDate: todayIso(),
    lastRenewalDate: "",
    notes: "",
    ...overrides,
  };
}

function SectionCard({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{helper}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function MemberForm({
  mode,
  defaultValues,
  memberId,
  memberName,
  onCreated,
  onCancel,
  lockUnit,
  returnTo,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<MemberFormValues>;
  memberId?: string;
  memberName?: string;
  onCreated?: (
    id: string,
    member?: {
      id: string;
      fullName: string;
      unit: string;
      [key: string]: unknown;
    }
  ) => void | Promise<void>;
  onCancel?: () => void;
  lockUnit?: boolean;
  returnTo?: string | null;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [pendingUnit, setPendingUnit] = useState<Unit | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    mode: "onChange",
    defaultValues: emptyMemberValues(defaultValues),
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = form;

  const dob = watch("dateOfBirth");
  const photoUrl = watch("photoUrl");
  const fullName = watch("fullName");
  const currentUnit = watch("unit");
  const originalUnit = defaultValues?.unit;

  const liveAge = useMemo(() => {
    if (!dob) return null;
    try {
      return computeAge(parseDateInput(dob));
    } catch {
      return null;
    }
  }, [dob]);

  const ageWarning = useMemo(() => {
    if (liveAge === null) return null;
    if (liveAge < orgSettings.minimumAge) {
      return `Age ${liveAge} is below the usual minimum (${orgSettings.minimumAge}). You can still submit if this is an approved exception.`;
    }
    return null;
  }, [liveAge]);

  useEffect(() => {
    if (dob) {
      try {
        const d = parseDateInput(dob);
        if (d > new Date()) {
          form.setError("dateOfBirth", {
            type: "manual",
            message: "Date of birth cannot be in the future",
          });
        }
      } catch {
        /* ignore */
      }
    }
  }, [dob, form]);

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setValue("photoUrl", data.photoUrl, { shouldValidate: true });
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: MemberFormValues, confirmUnit = false) {
    if (
      mode === "edit" &&
      originalUnit &&
      values.unit !== originalUnit &&
      !confirmUnit
    ) {
      setPendingUnit(values.unit);
      setConfirmOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        const result = await createMember(values);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Member added", {
          description: `${values.fullName} · ${UNIT_LABELS[values.unit]}`,
        });
        reset(emptyMemberValues(defaultValues), {
          keepDefaultValues: false,
          keepDirty: false,
          keepErrors: false,
          keepIsValid: false,
          keepTouched: false,
        });
        const scroller = formRef.current?.closest("[data-scroll-form]");
        if (scroller instanceof HTMLElement) {
          scroller.scrollTo({ top: 0, behavior: "smooth" });
        }
        await onCreated?.(result.id, result.member);
        return;
      }

      if (!memberId) return;
      const result = await updateMember(memberId, values, {
        confirmUnitChange: confirmUnit || values.unit === originalUnit,
      });
      if (!result.success) {
        if (result.error === "UNIT_CHANGE_REQUIRES_CONFIRMATION") {
          setPendingUnit(values.unit);
          setConfirmOpen(true);
          return;
        }
        toast.error(result.error);
        return;
      }
      toast.success("Member updated");
      router.push(returnTo || `/members/${memberId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
      setPendingUnit(null);
    }
  }

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit((v) => onSubmit(v, false))}
        className="space-y-6"
      >
        <SectionCard
          title="A — Biodata"
          helper="Identity details used across the registry and birthday spotlight."
        >
          <Field
            label="Full name"
            required
            error={errors.fullName?.message}
            className="sm:col-span-2"
          >
            <Input {...register("fullName")} error={!!errors.fullName} />
          </Field>
          <Field label="Preferred name" error={errors.preferredName?.message}>
            <Input {...register("preferredName")} />
          </Field>
          <Field label="Gender" error={errors.gender?.message}>
            <Select {...register("gender")}>
              <option value="">— Select —</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Date of birth"
            required
            error={errors.dateOfBirth?.message}
            hint={
              liveAge !== null
                ? `Age: ${liveAge}${ageWarning ? "" : ""}`
                : undefined
            }
          >
            <Input
              type="date"
              {...register("dateOfBirth")}
              error={!!errors.dateOfBirth}
              max={todayIso()}
            />
          </Field>
          {ageWarning && (
            <p className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {ageWarning}
            </p>
          )}
          <Field label="Photo" className="sm:col-span-2">
            <div className="flex items-center gap-4">
              <Avatar photoUrl={photoUrl} name={fullName || "Member"} size="lg" />
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(file);
                  }}
                  className="text-sm"
                />
                <input type="hidden" {...register("photoUrl")} />
                {uploading && (
                  <span className="text-xs text-slate-500">Uploading…</span>
                )}
              </div>
            </div>
          </Field>
          <Field label="ID type" required error={errors.nationalIdType?.message}>
            <Select {...register("nationalIdType")} error={!!errors.nationalIdType}>
              {NATIONAL_ID_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ID_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="ID number" error={errors.nationalIdNumber?.message}>
            <Input {...register("nationalIdNumber")} />
          </Field>
        </SectionCard>

        <SectionCard
          title="B — Contact information"
          helper="Primary contact channels and emergency details."
        >
          <Field label="Email" required error={errors.email?.message}>
            <Input type="email" {...register("email")} error={!!errors.email} />
          </Field>
          <Field
            label="Phone (primary)"
            required
            error={errors.phonePrimary?.message}
          >
            <Input {...register("phonePrimary")} error={!!errors.phonePrimary} />
          </Field>
          <Field
            label="Phone (secondary)"
            error={errors.phoneSecondary?.message}
          >
            <Input {...register("phoneSecondary")} />
          </Field>
          <Field
            label="Address"
            required
            error={errors.address?.message}
            className="sm:col-span-2"
          >
            <Input {...register("address")} error={!!errors.address} />
          </Field>
          <Field label="City" required error={errors.city?.message}>
            <Input {...register("city")} error={!!errors.city} />
          </Field>
          <Field
            label="State / Region"
            required
            error={errors.stateRegion?.message}
          >
            <Input {...register("stateRegion")} error={!!errors.stateRegion} />
          </Field>
          <Field label="Postal code" error={errors.postalCode?.message}>
            <Input {...register("postalCode")} />
          </Field>
          <Field label="Country" required error={errors.country?.message}>
            <Input {...register("country")} error={!!errors.country} />
          </Field>
          <Field
            label="Emergency contact name"
            error={errors.emergencyContactName?.message}
          >
            <Input {...register("emergencyContactName")} />
          </Field>
          <Field
            label="Emergency contact phone"
            error={errors.emergencyContactPhone?.message}
          >
            <Input {...register("emergencyContactPhone")} />
          </Field>
        </SectionCard>

        <SectionCard
          title="C — Unit assignment"
          helper="Pick a unit visually — reassignment on edit is logged for tenure."
        >
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Unit<span className="ml-0.5 text-red-500">*</span>
            </p>
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {ALL_UNITS.map((u) => {
                    const selected = field.value === u;
                    const colors = UNIT_COLORS[u];
                    return (
                      <button
                        key={u}
                        type="button"
                        disabled={lockUnit}
                        onClick={() => field.onChange(u)}
                        className={cn(
                          "rounded-full border-2 px-4 py-2 text-sm font-semibold transition",
                          selected
                            ? colors.pill
                            : cn(colors.soft, colors.text, colors.border, "border"),
                          lockUnit && "cursor-default"
                        )}
                      >
                        {UNIT_LABELS[u]}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.unit && (
              <p className="mt-1 text-xs text-red-600">{errors.unit.message}</p>
            )}
          </div>
          <Field label="Role" error={errors.role?.message} hint='e.g. "Unit Lead", "Member"'>
            <Input {...register("role")} />
          </Field>
          <Field
            label="Unit assigned date"
            required
            error={errors.unitAssignedDate?.message}
          >
            <Input
              type="date"
              {...register("unitAssignedDate")}
              error={!!errors.unitAssignedDate}
            />
          </Field>
        </SectionCard>

        <SectionCard
          title="D — Membership timing"
          helper="Registration and status dates for reporting and tenure."
        >
          <Field
            label="Registration date"
            required
            error={errors.registrationDate?.message}
          >
            <Input
              type="date"
              {...register("registrationDate")}
              error={!!errors.registrationDate}
            />
          </Field>
          <Field
            label="Membership status"
            required
            error={errors.membershipStatus?.message}
          >
            <Select
              {...register("membershipStatus")}
              error={!!errors.membershipStatus}
            >
              {MEMBERSHIP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Status effective date"
            required
            error={errors.statusEffectiveDate?.message}
          >
            <Input
              type="date"
              {...register("statusEffectiveDate")}
              error={!!errors.statusEffectiveDate}
            />
          </Field>
          <Field label="Last renewal date" error={errors.lastRenewalDate?.message}>
            <Input type="date" {...register("lastRenewalDate")} />
          </Field>
          <Field
            label="Notes"
            error={errors.notes?.message}
            className="sm:col-span-2"
          >
            <Textarea rows={4} {...register("notes")} />
          </Field>
        </SectionCard>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onCancel) onCancel();
              else if (returnTo) router.push(returnTo);
              else router.back();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid || submitting}>
            {submitting
              ? mode === "create"
                ? "Registering…"
                : "Saving…"
              : mode === "create"
                ? "Register member"
                : "Save changes"}
          </Button>
        </div>
      </form>

      {mode === "edit" && pendingUnit && originalUnit && (
        <UnitReassignDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          memberName={memberName || fullName}
          fromUnit={originalUnit}
          toUnit={pendingUnit}
          loading={submitting}
          onConfirm={async () => {
            const values = form.getValues();
            values.unit = pendingUnit;
            await onSubmit(values, true);
          }}
        />
      )}

      {/* keep currentUnit referenced so watch stays hot in edit */}
      <span className="hidden">{currentUnit}</span>
    </>
  );
}
