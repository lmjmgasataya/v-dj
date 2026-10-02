import * as XLSX from "xlsx";
import { SERVICE_BUCKETS, type VgSnapshotData, type SnapshotLeaderRow } from "@/lib/vgSnapshot";

const GROUP_FIELDS: { header: string; value: (g: SnapshotLeaderRow["groups"][number]) => string }[] = [
  { header: "Lifestage of Victory Group members", value: (g) => g.lifestage },
  { header: "Name of your intern(s) in Victory Group", value: (g) => g.interns },
  { header: "Day of Victory Group meeting", value: (g) => g.day },
  { header: "Time of Victory Group meeting", value: (g) => g.time },
  { header: "Venue of Victory Group meeting", value: (g) => g.venue },
];

function groupCountAnswer(r: SnapshotLeaderRow): string {
  const n = r.groups.length;
  if (n === 0) return r.isLeadershipGroupLeader ? "I am only currently leading a Leadership Group" : "0 Victory Groups";
  return n === 1 ? "1 Victory Group" : `${n} Victory Groups`;
}

/**
 * The snapshot's leaders in the quarterly-update form's layout (same column headers as the
 * Google Form export), one row per leader. A leader's groups fill "Victory Group 1", "2", …
 * column blocks instead of the form's separate "k of N" blocks, so every row shares one set.
 */
function responsesSheet(rows: SnapshotLeaderRow[]): XLSX.WorkSheet {
  const hasTimestamp = rows.some((r) => r.timestamp);
  const maxGroups = Math.max(1, ...rows.map((r) => r.groups.length));
  const header = [
    ...(hasTimestamp ? ["Timestamp"] : []),
    "When did you begin leading a Victory Group?",
    "Last Name",
    "First Name",
    "Nick Name",
    "Mobile Number",
    "Facebook/Messenger Name",
    "Gender",
    "Age",
    "Choose your current life stage:",
    "Service you are serving",
    "Discipleship Journey completed:",
    "Are you a graduate of Leadership 113?",
    "Name of your Victory group leader",
    "Are you a Leadership Group?",
    "If Leadership Group, please provide the names of Victory Group leaders you are leading.",
    "How many Victory Groups are you currently leading?",
    ...Array.from({ length: maxGroups }, (_, i) => GROUP_FIELDS.map((f) => `Victory Group ${i + 1} - ${f.header}`)).flat(),
  ];
  const body = rows.map((r) => [
    ...(hasTimestamp ? [r.timestamp ?? ""] : []),
    r.startedLeading,
    r.lastName,
    r.firstName,
    r.nickname,
    r.mobileNumber,
    r.facebook,
    r.gender,
    r.age,
    r.lifestage,
    r.service,
    r.discipleshipJourney,
    r.leadership113,
    r.ownVgLeader,
    r.isLeadershipGroupLeader ? "Yes, I am leading at least one (1) VG Leader" : "No",
    r.leadershipGroupMembers,
    groupCountAnswer(r),
    ...Array.from({ length: maxGroups }, (_, i) => {
      const g = r.groups[i];
      return GROUP_FIELDS.map((f) => (g ? f.value(g) : ""));
    }).flat(),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws["!cols"] = header.map((h) => ({ wch: Math.min(Math.max(h.length, 12), 40) }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: body.length, c: header.length - 1 } }) };
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  return ws;
}

/** Counts per service bucket, like the totals under the form's responses. */
function summarySheet(label: string, asOfDate: string, data: VgSnapshotData): XLSX.WorkSheet {
  const header = ["Service", "VG Leaders", "Victory Groups", "Interns", "Leadership Group Leaders", "Male VGL", "Female VGL"];
  const rows = SERVICE_BUCKETS.map((b) => [
    b,
    data.byService[b].vgLeaders,
    data.byService[b].victoryGroups,
    data.byService[b].interns,
    data.byService[b].leadershipGroups,
    data.vglByGender[b].male,
    data.vglByGender[b].female,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    [`${label} — as of ${asOfDate}`],
    [],
    header,
    ...rows,
    [
      "TOTAL",
      data.totals.vgLeaders,
      data.totals.victoryGroups,
      data.totals.interns,
      data.totals.leadershipGroups,
      data.genderTotals.male,
      data.genderTotals.female,
    ],
    [],
    ["Goals", "VG Leaders", data.goals.vgLeaders, "Leadership Group Leaders", data.goals.leadershipGroups],
  ]);
  ws["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 24 }, { wch: 10 }, { wch: 12 }];
  return ws;
}

/** Fallback for snapshots without per-leader rows: the names behind each count, by service. */
function namesSheet(title: string, items: { service: string; name: string }[]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([["Service", title], ...items.map((i) => [i.service, i.name])]);
  ws["!cols"] = [{ wch: 14 }, { wch: 60 }];
  return ws;
}

export function snapshotWorkbook(label: string, asOfDate: string, data: VgSnapshotData): Buffer {
  const wb = XLSX.utils.book_new();
  if (data.leaderRows?.length) XLSX.utils.book_append_sheet(wb, responsesSheet(data.leaderRows), "Responses");
  XLSX.utils.book_append_sheet(wb, summarySheet(label, asOfDate, data), "Summary");

  if (!data.leaderRows?.length && data.detailsByService) {
    const details = data.detailsByService;
    const lists: [string, (b: (typeof SERVICE_BUCKETS)[number]) => string[]][] = [
      ["VG Leaders", (b) => details[b].vgLeaders.map((r) => r.name)],
      ["Victory Groups", (b) => details[b].victoryGroups.map((g) => g.label)],
      ["Interns", (b) => details[b].interns],
      ["Leadership Group Leaders", (b) => details[b].leadershipGroups.map((r) => r.name)],
    ];
    for (const [title, names] of lists) {
      const items = SERVICE_BUCKETS.flatMap((b) => names(b).map((name) => ({ service: b, name })));
      XLSX.utils.book_append_sheet(wb, namesSheet(title, items), title);
    }
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
