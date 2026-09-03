"use client";

import { useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  memberFormSchema,
  type MemberFormValues,
} from "@/lib/validations/member";
import {
  GENDERS,
  MembershipStatus,
  type Unit,
} from "@/lib/enums";
import { ALL_UNITS, UNIT_LABELS, unitChipStyle } from "@/lib/unit-colors";
import { orgSettings } from "@/lib/org-settings";
import { computeAge } from "@/lib/dates";
import { cn, formatDateInput, parseDateInput } from "@/lib/utils";
import { createMember, updateMember } from "@/lib/members/actions";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { UnitReassignDialog } from "@/components/members/UnitReassignDialog";
import {
  BLOOD_GROUPS,
  QUALIFICATIONS,
  SEWA_ROLES,
  SEWA_ROLE_LABELS,
  SKILL_OPTIONS,
  TYPE_LABELS,
  joinSkills,
  parseSkills,
} from "@/lib/sewadaar";

function todayIso() {
  return formatDateInput(new Date());
}

function emptyMemberValues(
  overrides?: Partial<MemberFormValues>
): MemberFormValues {
  const today = todayIso();
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
    city: orgSettings.locationName,
    stateRegion: orgSettings.defaultState,
    postalCode: "",
    country: orgSettings.defaultCountry,
    emergencyContactName: "",
    emergencyContactPhone: "",
    unit: "Unit1",
    unitAssignedDate: today,
    role: "",
    sewaRole: "Sewadal",
    registrationDate: today,
    membershipStatus: MembershipStatus.Active,
    statusEffectiveDate: today,
    lastRenewalDate: "",
    notes: "",
    fatherHusbandName: "",
    qualification: "",
    profession: "",
    skills: "",
    bloodGroup: "",
    identityDocUrl: "",
    ...overrides,
  };
}

function FormRow({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-1.5 sm:grid-cols-[11.5rem_minmax(0,28rem)] sm:gap-x-4">
      <span className="pt-2 text-sm font-medium text-slate-700 sm:text-right">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <div className="min-w-0">
        {children}
        {hint && !error ? (
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [skillQuery, setSkillQuery] = useState("");
  const [pendingUnit, setPendingUnit] = useState<Unit | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
  const fullName = watch("fullName");
  const currentUnit = watch("unit");
  const identityDocUrl = watch("identityDocUrl");
  const photoUrl = watch("photoUrl");
  const selectedSkills = parseSkills(watch("skills"));
  const originalUnit = defaultValues?.unit;

  const liveAge = useMemo(() => {
    if (!dob) return null;
    try {
      return computeAge(parseDateInput(dob));
    } catch {
      return null;
    }
  }, [dob]);

  const visibleSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    if (!q) return SKILL_OPTIONS;
    return SKILL_OPTIONS.filter((s) => s.toLowerCase().includes(q));
  }, [skillQuery]);

  function toggleSkill(skill: string) {
    const next = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setValue("skills", joinSkills(next), { shouldValidate: true, shouldDirty: true });
  }

  async function uploadPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Profile photo must be an image");
      return;
    }
    setPhotoUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const url = data.photoUrl || data.url;
      setValue("photoUrl", url, { shouldValidate: true, shouldDirty: true });
      toast.success("Profile photo added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function uploadIdentity(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const url = data.url || data.photoUrl;
      setValue("identityDocUrl", url, { shouldValidate: true, shouldDirty: true });
      toast.success("Document uploaded");
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

    const payload: MemberFormValues = {
      ...values,
      unitAssignedDate: values.registrationDate,
      statusEffectiveDate: values.statusEffectiveDate || values.registrationDate,
      role: values.role || values.profession,
    };

    setSubmitting(true);
    try {
      if (mode === "create") {
        const result = await createMember(payload);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Sewadaar added", {
          description: `${values.fullName} · ${UNIT_LABELS[values.unit]}`,
        });
        reset(emptyMemberValues(defaultValues), {
          keepDefaultValues: false,
          keepDirty: false,
          keepErrors: false,
          keepIsValid: false,
          keepTouched: false,
        });
        setSkillQuery("");
        const scroller = formRef.current?.closest("[data-scroll-form]");
        if (scroller instanceof HTMLElement) {
          scroller.scrollTo({ top: 0, behavior: "smooth" });
        }
        await onCreated?.(result.id, result.member);
        return;
      }

      if (!memberId) return;
      const result = await updateMember(memberId, payload, {
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
      toast.success("Sewadaar updated");
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
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {mode === "create" ? "New Sewadaar" : "Edit Sewadaar"}
          </h2>
          <dl className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-3">
            <div>
              <dt className="inline font-medium text-slate-500">Unit: </dt>
              <dd className="inline">{UNIT_LABELS[currentUnit]}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-slate-500">Khetra: </dt>
              <dd className="inline">{orgSettings.khetra}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-slate-500">Zone: </dt>
              <dd className="inline">{orgSettings.zone}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5 sm:px-7 sm:py-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-4">
          <FormRow
            label="Unit"
            required
            error={errors.unit?.message}
          >
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {ALL_UNITS.map((u) => {
                    const selected = field.value === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        disabled={lockUnit}
                        onClick={() => field.onChange(u)}
                        className={cn(
                          "rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition",
                          lockUnit && "cursor-default opacity-80"
                        )}
                        style={unitChipStyle(u, selected)}
                      >
                        {UNIT_LABELS[u]}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </FormRow>

          <FormRow
            label="Sewa role"
            required
            error={errors.sewaRole?.message}
          >
            <Select {...register("sewaRole")} error={!!errors.sewaRole}>
              {SEWA_ROLES.map((role) => (
                <option key={role} value={role}>
                  {SEWA_ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow
            label="Date Of Joining"
            required
            error={errors.registrationDate?.message}
          >
            <Input
              type="date"
              {...register("registrationDate")}
              error={!!errors.registrationDate}
            />
          </FormRow>

          <FormRow label="Type" error={errors.gender?.message}>
            <Select {...register("gender")}>
              <option value="">Select type</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {TYPE_LABELS[g]}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow label="Name" required error={errors.fullName?.message}>
            <Input
              placeholder="Name"
              {...register("fullName")}
              error={!!errors.fullName}
            />
          </FormRow>

          <FormRow
            label="Father/Husband Name"
            error={errors.fatherHusbandName?.message}
          >
            <Input
              placeholder="Father/Husband Name"
              {...register("fatherHusbandName")}
            />
          </FormRow>

          <FormRow
            label="Date Of Birth"
            required
            error={errors.dateOfBirth?.message}
            hint={liveAge !== null ? `Age: ${liveAge}` : undefined}
          >
            <Input
              type="date"
              {...register("dateOfBirth")}
              error={!!errors.dateOfBirth}
              max={todayIso()}
            />
          </FormRow>

          {liveAge !== null && liveAge < orgSettings.minimumAge && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:ml-[12.5rem]">
              Age {liveAge} is below the usual minimum ({orgSettings.minimumAge}).
              You can still submit if this is an approved exception.
            </p>
          )}

          <FormRow label="Email" required error={errors.email?.message}>
            <Input
              type="email"
              placeholder="Email"
              {...register("email")}
              error={!!errors.email}
            />
          </FormRow>

          <FormRow
            label="Qualification"
            error={errors.qualification?.message}
          >
            <Select {...register("qualification")}>
              <option value="">Select Education</option>
              {QUALIFICATIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow label="Profession" error={errors.profession?.message}>
            <Input placeholder="Profession" {...register("profession")} />
          </FormRow>

          <FormRow label="Skills" error={errors.skills?.message}>
            <div className="space-y-2">
              <Input
                value={skillQuery}
                onChange={(e) => setSkillQuery(e.target.value)}
                placeholder="Search for skills."
              />
              <div className="max-h-40 overflow-y-auto rounded-md border border-slate-300 bg-white">
                {visibleSkills.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-500">
                    No skills match “{skillQuery}”
                  </p>
                ) : (
                  visibleSkills.map((skill) => (
                    <label
                      key={skill}
                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selectedSkills.includes(skill)}
                        onChange={() => toggleSkill(skill)}
                      />
                      {skill}
                    </label>
                  ))
                )}
              </div>
              {selectedSkills.length > 0 && (
                <p className="text-xs text-slate-500">
                  {selectedSkills.join(", ")}
                </p>
              )}
              <input type="hidden" {...register("skills")} />
            </div>
          </FormRow>

          <FormRow label="Address" required error={errors.address?.message}>
            <Textarea
              rows={3}
              placeholder="Address"
              {...register("address")}
              error={!!errors.address}
            />
          </FormRow>

          <FormRow
            label="Contact No"
            required
            error={errors.phonePrimary?.message}
          >
            <Input
              placeholder="Contact No"
              {...register("phonePrimary")}
              error={!!errors.phonePrimary}
            />
          </FormRow>

          <FormRow label="Blood Group" error={errors.bloodGroup?.message}>
            <Select {...register("bloodGroup")}>
              <option value="">Select Blood Group</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </FormRow>

          <FormRow label="Remark" error={errors.notes?.message}>
            <Textarea rows={3} placeholder="Remark" {...register("notes")} />
          </FormRow>

          <FormRow label="Identity Doc" error={errors.identityDocUrl?.message}>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadIdentity(file);
                }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
              {uploading && (
                <p className="text-xs text-slate-500">Uploading…</p>
              )}
              {identityDocUrl && (
                <a
                  href={identityDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  View uploaded document
                </a>
              )}
              <input type="hidden" {...register("identityDocUrl")} />
              <input type="hidden" {...register("photoUrl")} />
            </div>
          </FormRow>

          <input type="hidden" {...register("preferredName")} />
          <input type="hidden" {...register("nationalIdType")} />
          <input type="hidden" {...register("nationalIdNumber")} />
          <input type="hidden" {...register("phoneSecondary")} />
          <input type="hidden" {...register("city")} />
          <input type="hidden" {...register("stateRegion")} />
          <input type="hidden" {...register("postalCode")} />
          <input type="hidden" {...register("country")} />
          <input type="hidden" {...register("emergencyContactName")} />
          <input type="hidden" {...register("emergencyContactPhone")} />
          <input type="hidden" {...register("unitAssignedDate")} />
          <input type="hidden" {...register("role")} />
          <input type="hidden" {...register("membershipStatus")} />
          <input type="hidden" {...register("statusEffectiveDate")} />
          <input type="hidden" {...register("lastRenewalDate")} />
          </div>

          <aside className="mx-auto w-[9.75rem] shrink-0 lg:mx-0 lg:sticky lg:top-24">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              Profile photo
            </p>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="group relative block h-[13.2rem] w-full overflow-hidden rounded-md border-2 border-slate-300 bg-slate-50 shadow-inner"
              aria-label="Upload profile photo"
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={fullName || "Profile photo"}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-slate-500">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-10 w-10 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden
                  >
                    <circle cx="12" cy="8" r="3.25" />
                    <path d="M5 19.5c.8-3.2 3.4-5 7-5s6.2 1.8 7 5" />
                  </svg>
                  Vertical photo
                  <span className="font-medium text-blue-700 group-hover:underline">
                    Click to upload
                  </span>
                </span>
              )}
              {photoUploading && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-medium text-slate-700">
                  Uploading…
                </span>
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadPhoto(file);
                e.target.value = "";
              }}
            />
            <div className="mt-2 flex justify-center gap-3 text-xs">
              <button
                type="button"
                className="font-medium text-blue-700 hover:underline"
                onClick={() => photoInputRef.current?.click()}
              >
                {photoUrl ? "Change" : "Add photo"}
              </button>
              {photoUrl ? (
                <button
                  type="button"
                  className="font-medium text-red-600 hover:underline"
                  onClick={() =>
                    setValue("photoUrl", "", {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-slate-400">
              Passport-style, face in frame
            </p>
          </aside>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
          <Button
            type="submit"
            disabled={!isValid || submitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting
              ? mode === "create"
                ? "Submitting…"
                : "Saving…"
              : "Submit"}
          </Button>
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
    </>
  );
}
