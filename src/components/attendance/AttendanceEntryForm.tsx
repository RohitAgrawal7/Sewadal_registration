"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, parseISO, differenceInYears } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AttendanceStatus,
  Gender,
  GENDERS,
  Unit,
} from "@/lib/enums";
import { ALL_UNITS, UNIT_LABELS } from "@/lib/unit-colors";
import { GENDER_LABELS } from "@/lib/validations/member";
import {
  markMemberPresent,
  quickAddMemberAndMark,
  saveAttendanceForDate,
  saveAttendanceSession,
} from "@/lib/attendance/actions";
import type { MemberAttendanceRow } from "@/lib/attendance/stats";
import { computeAge } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UnitBadge } from "@/components/ui/UnitBadge";
import { GenderBadge } from "@/components/ui/GenderBadge";
import { genderColors } from "@/lib/gender-colors";
import { cn } from "@/lib/utils";

export type SearchMember = {
  id: string;
  fullName: string;
  preferredName: string | null;
  gender: string | null;
  phonePrimary: string;
  address: string;
  city: string;
  stateRegion: string;
  unit: string;
  dateOfBirth: Date | string;
  membershipStatus?: string;
};

function matchesName(member: SearchMember, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const parts = q.split(/\s+/).filter(Boolean);
  const hay = `${member.fullName} ${member.preferredName ?? ""}`.toLowerCase();
  return parts.every((word) => hay.includes(word));
}

export function AttendanceSessionDetails({
  dateKey,
  year,
  month,
  session,
}: {
  dateKey: string;
  year: number;
  month: number;
  session: {
    topic: string | null;
    sanchalanSewa: string | null;
    stageSewa: string | null;
  } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [topic, setTopic] = useState(session?.topic ?? "");
  const [sanchalanSewa, setSanchalanSewa] = useState(
    session?.sanchalanSewa ?? ""
  );
  const [stageSewa, setStageSewa] = useState(session?.stageSewa ?? "");

  useEffect(() => {
    setTopic(session?.topic ?? "");
    setSanchalanSewa(session?.sanchalanSewa ?? "");
    setStageSewa(session?.stageSewa ?? "");
  }, [session, dateKey]);

  function saveSession() {
    startTransition(async () => {
      const result = await saveAttendanceSession(dateKey, {
        topic,
        sanchalanSewa,
        stageSewa,
      });
      if (result.success) toast.success("Session details saved");
      else toast.error(result.error);
    });
  }

  const dateLabel = format(parseISO(dateKey), "EEE, d MMM");

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900">
        Recording for:{" "}
        <span className="font-semibold">
          {format(new Date(year, month - 1, 1), "MMMM yyyy")} → {dateLabel}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Topic" className="[&>span]:text-xs">
          <Input
            className="h-8 text-sm"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Leadership & Teamwork"
          />
        </Field>
        <Field label="Sanchalan Sewa" className="[&>span]:text-xs">
          <Input
            className="h-8 text-sm"
            value={sanchalanSewa}
            onChange={(e) => setSanchalanSewa(e.target.value)}
            placeholder="Team A"
          />
        </Field>
        <Field label="Stage Sewa" className="[&>span]:text-xs">
          <Input
            className="h-8 text-sm"
            value={stageSewa}
            onChange={(e) => setStageSewa(e.target.value)}
            placeholder="Welcome"
          />
        </Field>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={saveSession}
      >
        Save session details
      </Button>
    </div>
  );
}

export function AttendanceEntryForm({
  dateKey,
  members,
  onMarkedPresent,
}: {
  dateKey: string;
  members: SearchMember[];
  onMarkedPresent?: (row: MemberAttendanceRow) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [nameQuery, setNameQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState<string>(Unit.Unit1);
  const [status, setStatus] = useState<AttendanceStatus>(
    AttendanceStatus.Present
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = nameQuery.trim();
    const list = q.length < 1
      ? members
      : members.filter((m) => matchesName(m, q));
    return list.slice(0, 20);
  }, [members, nameQuery]);

  function fillFromMember(m: SearchMember) {
    setSelectedId(m.id);
    setNameQuery(m.fullName);
    setGender(
      m.gender === Gender.Male ||
        m.gender === Gender.Female ||
        m.gender === Gender.Child
        ? m.gender
        : ""
    );
    setPhone(m.phonePrimary === "0000000000" ? "" : m.phonePrimary);
    const dob =
      typeof m.dateOfBirth === "string"
        ? new Date(m.dateOfBirth)
        : m.dateOfBirth;
    setAge(String(computeAge(dob)));
    setAddress(
      [m.address, m.city, m.stateRegion].filter((p) => p && p !== "—").join(", ")
    );
    setUnit(m.unit);
    setShowSuggestions(false);
  }

  function resetPersonFields() {
    setSelectedId(null);
    setNameQuery("");
    setGender("");
    setPhone("");
    setAge("");
    setAddress("");
    setUnit(Unit.Unit1);
    setStatus(AttendanceStatus.Present);
  }

  function submitPerson() {
    startTransition(async () => {
      if (selectedId) {
        const result =
          status === AttendanceStatus.Present
            ? await markMemberPresent(dateKey, selectedId)
            : await saveAttendanceForDate(dateKey, [
                { memberId: selectedId, status },
              ]);
        if (result.success) {
          toast.success(
            `${nameQuery} marked ${status.toLowerCase()} for ${format(parseISO(dateKey), "MMM d")}`
          );
          if (status === AttendanceStatus.Present) {
            onMarkedPresent?.({
              memberId: selectedId,
              fullName: nameQuery.trim(),
              unit,
              gender: gender || null,
              status: AttendanceStatus.Present,
              notes: null,
            });
          }
          resetPersonFields();
          router.refresh();
        } else toast.error(result.error);
        return;
      }

      const result = await quickAddMemberAndMark(dateKey, {
        fullName: nameQuery,
        gender,
        phone,
        age,
        address,
        unit,
        status,
      });
      if (result.success) {
        toast.success(`Added ${nameQuery} and marked ${status.toLowerCase()}`);
        if (status === AttendanceStatus.Present) {
          onMarkedPresent?.({
            memberId: result.id,
            fullName: nameQuery.trim(),
            unit,
            gender: gender || null,
            status: AttendanceStatus.Present,
            notes: null,
          });
        }
        resetPersonFields();
        router.refresh();
      } else toast.error(result.error);
    });
  }

  const dateLabel = format(parseISO(dateKey), "EEE, d MMM");

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Add / find member</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Recording for{" "}
          <span className="font-semibold text-slate-700">{dateLabel}</span>.
          Type a name to mark an existing member, or fill the form to add
          someone new.
        </p>
      </div>

      <div className="space-y-3" ref={wrapRef}>
          <Field label="Member name" required>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>
              <Input
                className="pl-9"
                value={nameQuery}
                placeholder="Type name e.g. Aarav…"
                autoComplete="off"
                onChange={(e) => {
                  setNameQuery(e.target.value);
                  setSelectedId(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && suggestions.length > 0 && members.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {suggestions.map((m) => {
                    const dob =
                      typeof m.dateOfBirth === "string"
                        ? new Date(m.dateOfBirth)
                        : m.dateOfBirth;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          className={cn(
                            "flex w-full items-start gap-2 px-3 py-2 text-left",
                            genderColors(m.gender).row
                          )}
                          onClick={() => fillFromMember(m)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {m.fullName}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {m.phonePrimary !== "0000000000"
                                ? m.phonePrimary
                                : "No phone"}{" "}
                              · age {differenceInYears(new Date(), dob)}
                              {m.membershipStatus &&
                              m.membershipStatus !== "Active"
                                ? ` · ${m.membershipStatus}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <UnitBadge unit={m.unit} />
                            <GenderBadge gender={m.gender} />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {showSuggestions &&
                nameQuery.trim().length > 0 &&
                suggestions.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
                    No match — fill gender & unit below to add as a new member.
                  </div>
                )}
            </div>
            {selectedId && (
              <p className="mt-1 text-xs font-medium text-emerald-700">
                Existing member selected — will mark attendance (not create new)
              </p>
            )}
          </Field>

          <Field label="Gender" required>
            <Select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select Male / Female / Child</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone (optional)">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
              />
            </Field>
            <Field label="Age (optional)">
              <Input
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="16"
              />
            </Field>
          </div>

          <Field label="Address (optional)">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="City, State"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Unit / class" required={!selectedId}>
              <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {ALL_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as AttendanceStatus)
                }
              >
                <option value={AttendanceStatus.Present}>Present</option>
                <option value={AttendanceStatus.Absent}>Absent</option>
              </Select>
            </Field>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={pending || !nameQuery.trim()}
            onClick={submitPerson}
          >
            {pending
              ? "Saving…"
              : selectedId
                ? `Mark ${status.toLowerCase()} → ${dateLabel}`
                : `Save new member → ${dateLabel}`}
          </Button>
        </div>
    </div>
  );
}
