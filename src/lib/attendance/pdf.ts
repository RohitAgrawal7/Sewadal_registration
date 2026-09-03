"use client";

import type { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { orgSettings } from "@/lib/org-settings";
import { UNIT_LABELS } from "@/lib/unit-colors";
import type { Unit } from "@/lib/enums";

type MemberPdfRow = {
  fullName: string;
  unit: string;
  gender: string | null;
  sessions: number;
  attended: number;
  absentCount: number;
  rate: number;
  status?: string | null;
};

type DayReport = {
  kind: "day";
  dateKey: string;
  unitFilter: string;
  totals: {
    present: number;
    absent: number;
    expected: number;
    rate: number;
  };
  byUnit: Array<{
    label: string;
    present: number;
    absent: number;
    expected: number;
    rate: number;
  }>;
  byGender: Array<{
    label: string;
    present: number;
    absent: number;
    expected: number;
    rate: number;
  }>;
  rows: MemberPdfRow[];
};

type RangeReport = {
  kind: "range";
  fromKey: string;
  toKey: string;
  unitFilter: string;
  sessionCount: number;
  memberCount: number;
  overall: {
    present: number;
    absent: number;
    expected: number;
    rate: number;
  };
  byUnit: Array<{
    label: string;
    present: number;
    absent: number;
    expected: number;
    rate: number;
  }>;
  memberStats: MemberPdfRow[];
};

export type AttendancePdfData = DayReport | RangeReport;

export type AttendancePdfFile = {
  blob: Blob;
  url: string;
  filename: string;
};

function unitLabel(unit: string) {
  return UNIT_LABELS[unit as Unit] ?? unit;
}

function pct(rate: number) {
  return `${rate}%`;
}

function memberBody(rows: MemberPdfRow[]) {
  return rows.map((r, i) => [
    i + 1,
    r.fullName,
    unitLabel(r.unit),
    r.gender ?? "—",
    r.sessions,
    r.attended,
    r.absentCount,
    pct(r.rate),
  ]);
}

const MEMBER_HEAD = [
  ["#", "Name", "Unit", "Gender", "Total sessions", "Attended", "Absent", "%"],
];

function lastY(doc: jsPDF) {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;
}

async function loadPdf() {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable: autoTableMod.default };
}

export async function buildAttendancePdf(data: AttendancePdfData) {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = 16;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(orgSettings.orgName, margin, y);
  y += 7;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    data.kind === "day" ? "Attendance preview" : "Attendance range report",
    margin,
    y
  );
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(80);
  if (data.kind === "day") {
    doc.text(
      `Date: ${format(parseISO(data.dateKey), "EEEE, MMMM d, yyyy")}`,
      margin,
      y
    );
  } else {
    doc.text(
      `Period: ${format(parseISO(data.fromKey), "MMM d, yyyy")} – ${format(parseISO(data.toKey), "MMM d, yyyy")}`,
      margin,
      y
    );
  }
  y += 4;
  doc.text(
    `Unit filter: ${data.unitFilter === "all" ? "All units" : unitLabel(data.unitFilter)}`,
    margin,
    y
  );
  y += 4;
  doc.text(`Generated: ${format(new Date(), "MMM d, yyyy HH:mm")}`, margin, y);
  y += 8;
  doc.setTextColor(0);

  if (data.kind === "day") {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Total", "Attended", "Absent", "Percentage"]],
      body: [[
        data.totals.expected,
        data.totals.present,
        data.totals.absent,
        pct(data.totals.rate),
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
    });

    y = lastY(doc) + 8;

    doc.setFont("helvetica", "bold");
    doc.text("By unit", margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Unit", "Total", "Attended", "Absent", "Percentage"]],
      body: data.byUnit.map((u) => [
        u.label,
        u.expected,
        u.present,
        u.absent,
        pct(u.rate),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
      margin: { left: margin, right: margin },
    });

    y = lastY(doc) + 8;

    doc.setFont("helvetica", "bold");
    doc.text("By gender", margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [["Gender", "Total", "Attended", "Absent", "Percentage"]],
      body: data.byGender.map((g) => [
        g.label,
        g.expected,
        g.present,
        g.absent,
        pct(g.rate),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
      margin: { left: margin, right: margin },
    });

    y = lastY(doc) + 8;

    doc.setFont("helvetica", "bold");
    doc.text(`Present list (${data.rows.length})`, margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: MEMBER_HEAD,
      body: memberBody(data.rows),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
    });

    return {
      doc,
      filename: `attendance-${data.dateKey}.pdf`,
    };
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Period summary", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Sessions", "Members", "Total", "Attended", "Absent", "Percentage"]],
    body: [[
      data.sessionCount,
      data.memberCount,
      data.overall.expected,
      data.overall.present,
      data.overall.absent,
      pct(data.overall.rate),
    ]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
    margin: { left: margin, right: margin },
  });

  y = lastY(doc) + 8;

  doc.setFont("helvetica", "bold");
  doc.text("By unit", margin, y);
  autoTable(doc, {
    startY: y + 2,
    head: [["Unit", "Total", "Attended", "Absent", "Percentage"]],
    body: data.byUnit.map((u) => [
      u.label,
      u.expected,
      u.present,
      u.absent,
      pct(u.rate),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: margin, right: margin },
  });

  y = lastY(doc) + 8;

  doc.setFont("helvetica", "bold");
  doc.text("Per-member totals", margin, y);
  autoTable(doc, {
    startY: y + 2,
    head: MEMBER_HEAD,
    body: memberBody(data.memberStats),
    styles: { fontSize: 7.5 },
    headStyles: { fillColor: [15, 23, 42] },
    margin: { left: margin, right: margin },
  });

  return {
    doc,
    filename: `attendance-${data.fromKey}_to_${data.toKey}.pdf`,
  };
}

export async function attendancePdfFile(
  data: AttendancePdfData
): Promise<AttendancePdfFile> {
  const { doc, filename } = await buildAttendancePdf(data);
  const blob = doc.output("blob");
  return {
    blob,
    filename,
    url: URL.createObjectURL(blob),
  };
}

export async function downloadAttendancePdf(data: AttendancePdfData) {
  const { doc, filename } = await buildAttendancePdf(data);
  doc.save(filename);
}

export function downloadPdfFile(file: AttendancePdfFile) {
  const link = document.createElement("a");
  link.href = file.url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
