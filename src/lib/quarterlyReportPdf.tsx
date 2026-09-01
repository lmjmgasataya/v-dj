import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { SERVICE_BUCKETS, type VgSnapshotData, type VgServiceBucket } from "./vgSnapshot";

const COLORS = {
  bg: "#EDEBE4",
  darkBg: "#141414",
  headerBar: "#111111",
  subHeader: "#8f8f8f",
  rowA: "#EDEBE4",
  rowB: "#E1DFD5",
  totalRow: "#D6D3C6",
  darkRowA: "#1c1c1c",
  darkRowB: "#141414",
  darkTotalRow: "#262626",
  text: "#1f2937",
  border: "#c9c7bf",
  darkBorder: "#3a3a3a",
  green: "#15803d",
  red: "#dc2626",
};

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.bg, padding: 44, fontFamily: "Helvetica" },
  darkPage: { backgroundColor: COLORS.darkBg, padding: 44, fontFamily: "Helvetica" },

  titleSlide: { flex: 1, justifyContent: "center" },
  title: { fontSize: 32, fontFamily: "Helvetica-BoldOblique", color: "#2b2b2b", lineHeight: 1.2 },
  subtitle: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#2b2b2b", marginTop: 14 },

  dividerSlide: { flex: 1, justifyContent: "center", alignItems: "center" },
  dividerLine: { borderBottomWidth: 1, borderBottomColor: "#9c9a90", width: "100%", marginTop: 10 },
  dividerLineWrap: { width: "100%", position: "absolute", bottom: 60, gap: 14 },

  darkDividerSlide: { flex: 1, justifyContent: "center" },
  darkDividerTitle: { fontSize: 30, fontFamily: "Helvetica-Bold", color: "#fff" },
  darkDividerRule: { borderBottomWidth: 1, borderBottomColor: "#4b4b4b", marginVertical: 24 },

  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, overflow: "hidden" },
  darkTable: { borderWidth: 1, borderColor: COLORS.darkBorder, borderRadius: 2, overflow: "hidden" },

  headerBar: { backgroundColor: COLORS.headerBar, paddingVertical: 10, paddingHorizontal: 14 },
  headerBarText: { color: "#fff", fontSize: 16, fontFamily: "Helvetica-Bold" },

  subHeaderRow: { flexDirection: "row", backgroundColor: COLORS.subHeader },
  subHeaderCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, color: "#fff", fontSize: 10, fontFamily: "Helvetica-Bold" },
  labelHeaderCell: { flex: 1.6 },

  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.border },
  darkRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.darkBorder },

  cell: { flex: 1, paddingVertical: 9, paddingHorizontal: 10, fontSize: 12, fontFamily: "Helvetica-Bold", color: COLORS.text },
  darkCell: { flex: 1, paddingVertical: 9, paddingHorizontal: 10, fontSize: 12, fontFamily: "Helvetica-Bold", color: "#e5e5e5" },
  labelCell: { flex: 1.6 },

  pageTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.text, marginBottom: 14 },
  darkPageTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#fff", marginBottom: 14 },
});

interface Row {
  label: string;
  val1: number | string;
  val2?: number | string | null;
  bold?: boolean;
}

function diffCellStyle(diff: number) {
  if (diff === 0) return { color: "#000" };
  return { color: diff > 0 ? COLORS.green : COLORS.red };
}

function formatDiff(diff: number) {
  if (diff === 0) return "–";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function ComparisonTable({
  title,
  col1Header,
  col2Header,
  diffHeader = "CHANGE",
  rows,
  theme = "light",
}: {
  title: string;
  col1Header: string;
  col2Header?: string | null;
  diffHeader?: string;
  rows: Row[];
  theme?: "light" | "dark";
}) {
  const dark = theme === "dark";
  const showCompare = !!col2Header;

  return (
    <View style={dark ? styles.darkTable : styles.table}>
      <View style={styles.headerBar}>
        <Text style={styles.headerBarText}>{title}</Text>
      </View>
      <View style={styles.subHeaderRow}>
        <Text style={[styles.subHeaderCell, styles.labelHeaderCell]} />
        <Text style={styles.subHeaderCell}>{col1Header}</Text>
        {showCompare && <Text style={styles.subHeaderCell}>{col2Header}</Text>}
        {showCompare && <Text style={styles.subHeaderCell}>{diffHeader}</Text>}
      </View>
      {rows.map((r, i) => {
        const diff =
          showCompare && typeof r.val1 === "number" && typeof r.val2 === "number"
            ? r.val1 - r.val2
            : null;
        return (
          <View
            key={i}
            style={[
              dark ? styles.darkRow : styles.row,
              { backgroundColor: r.bold ? (dark ? COLORS.darkTotalRow : COLORS.totalRow) : i % 2 === 0 ? (dark ? COLORS.darkRowA : COLORS.rowA) : (dark ? COLORS.darkRowB : COLORS.rowB) },
            ]}
          >
            <Text style={[dark ? styles.darkCell : styles.cell, styles.labelCell]}>{r.label}</Text>
            <Text style={dark ? styles.darkCell : styles.cell}>{r.val1}</Text>
            {showCompare && <Text style={dark ? styles.darkCell : styles.cell}>{r.val2}</Text>}
            {showCompare && (
              <Text style={[dark ? styles.darkCell : styles.cell, diff != null ? diffCellStyle(diff) : {}]}>
                {diff != null ? formatDiff(diff) : "—"}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function GenderTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; male: number; female: number; total: number; bold?: boolean }[];
}) {
  return (
    <View style={styles.table}>
      <View style={styles.headerBar}>
        <Text style={styles.headerBarText}>{title}</Text>
      </View>
      <View style={styles.subHeaderRow}>
        <Text style={[styles.subHeaderCell, styles.labelHeaderCell]} />
        <Text style={styles.subHeaderCell}>MALE</Text>
        <Text style={styles.subHeaderCell}>FEMALE</Text>
        <Text style={styles.subHeaderCell}>TOTAL</Text>
      </View>
      {rows.map((r, i) => (
        <View
          key={i}
          style={[styles.row, { backgroundColor: r.bold ? COLORS.totalRow : i % 2 === 0 ? COLORS.rowA : COLORS.rowB }]}
        >
          <Text style={[styles.cell, styles.labelCell]}>{r.label}</Text>
          <Text style={styles.cell}>{r.male}</Text>
          <Text style={styles.cell}>{r.female}</Text>
          <Text style={styles.cell}>{r.total}</Text>
        </View>
      ))}
    </View>
  );
}

function ConvergenceTable({ entries }: { entries: { label: string; attendees: number }[] }) {
  return (
    <View style={styles.table}>
      <View style={[styles.headerBar, { backgroundColor: "#585858" }]}>
        <Text style={styles.headerBarText}>Leaders&apos; Convergence</Text>
      </View>
      <View style={styles.subHeaderRow}>
        <Text style={[styles.subHeaderCell, styles.labelHeaderCell]} />
        {entries.map((e, i) => (
          <Text key={i} style={styles.subHeaderCell}>{e.label}</Text>
        ))}
      </View>
      <View style={[styles.row, { backgroundColor: COLORS.rowA }]}>
        <Text style={[styles.cell, styles.labelCell]}>Number of Attendees</Text>
        {entries.map((e, i) => (
          <Text key={i} style={styles.cell}>{e.attendees}</Text>
        ))}
      </View>
    </View>
  );
}

function Leadership113Table({ batches }: { batches: { batchName: string; actual: number; goal: number }[] }) {
  return (
    <View style={{ gap: 16 }}>
      {batches.map((b, i) => {
        const retention = b.goal > 0 ? Math.round((b.actual / b.goal) * 100) : null;
        return (
          <View key={i} style={styles.table}>
            <View style={[styles.headerBar, { backgroundColor: "#585858" }]}>
              <Text style={styles.headerBarText}>Leadership 113 – {b.batchName}</Text>
            </View>
            <View style={styles.subHeaderRow}>
              <Text style={[styles.subHeaderCell, styles.labelHeaderCell]} />
              <Text style={styles.subHeaderCell}>ACTUAL</Text>
              <Text style={styles.subHeaderCell}>GOAL</Text>
              <Text style={styles.subHeaderCell}>RETENTION</Text>
            </View>
            <View style={[styles.row, { backgroundColor: COLORS.rowA }]}>
              <Text style={[styles.cell, styles.labelCell]}>Number of Students</Text>
              <Text style={styles.cell}>{b.actual}</Text>
              <Text style={styles.cell}>{b.goal}</Text>
              <Text style={[styles.cell, { color: retention != null && retention >= 100 ? COLORS.green : "#b45309" }]}>
                {retention == null ? "—" : `${retention}%`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const METRIC_LABELS: { key: keyof VgSnapshotData["totals"]; label: string }[] = [
  { key: "vgLeaders", label: "VG Leaders" },
  { key: "victoryGroups", label: "Victory Groups" },
  { key: "interns", label: "Interns" },
  { key: "leadershipGroups", label: "Leadership Group Leaders" },
];

export interface QuarterlyPdfSnapshot {
  label: string;
  asOfDate: string;
  data: VgSnapshotData;
}

export interface QuarterlyPdfProps {
  primary: QuarterlyPdfSnapshot;
  compare: QuarterlyPdfSnapshot | null;
  convergence: { label: string; attendees: number }[];
  leadership113: { batchName: string; actual: number; goal: number }[];
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

export function QuarterlyReportDocument({ primary, compare, convergence, leadership113 }: QuarterlyPdfProps) {
  const col1 = primary.label.toUpperCase();
  const col2 = compare ? compare.label.toUpperCase() : null;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.titleSlide}>
          <Text style={styles.title}>{primary.label.toUpperCase()} DISCIPLESHIP UPDATES</Text>
          <Text style={styles.subtitle}>{formatDate(primary.asOfDate)}</Text>
        </View>
      </Page>

      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.dividerSlide}>
          <Text style={styles.title}>{primary.label.toUpperCase()}{"\n"}DISCIPLESHIP DATABASE</Text>
          <View style={styles.dividerLineWrap}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerLine} />
            <View style={styles.dividerLine} />
          </View>
        </View>
      </Page>

      <Page size="A4" orientation="landscape" style={styles.page}>
        <ComparisonTable
          title="Number of Leaders"
          col1Header={col1}
          col2Header={col2}
          rows={METRIC_LABELS.map((m) => ({
            label: m.label.toUpperCase(),
            val1: primary.data.totals[m.key],
            val2: compare ? compare.data.totals[m.key] : null,
          }))}
        />
      </Page>

      {METRIC_LABELS.map((m) => (
        <Page key={m.key} size="A4" orientation="landscape" style={styles.page}>
          <ComparisonTable
            title={`Number of ${m.label}`}
            col1Header={col1}
            col2Header={col2}
            rows={[
              ...SERVICE_BUCKETS.map((bucket) => ({
                label: bucket,
                val1: primary.data.byService[bucket][m.key],
                val2: compare ? compare.data.byService[bucket][m.key] : null,
              })),
              { label: "TOTAL", val1: primary.data.totals[m.key], val2: compare ? compare.data.totals[m.key] : null, bold: true },
            ]}
          />
        </Page>
      ))}

      <Page size="A4" orientation="landscape" style={styles.page}>
        <GenderTable
          title={`${primary.label.toUpperCase()} VGL (PER GENDER)`}
          rows={[
            ...SERVICE_BUCKETS.map((bucket) => ({
              label: bucket,
              male: primary.data.vglByGender[bucket].male,
              female: primary.data.vglByGender[bucket].female,
              total: primary.data.byService[bucket].vgLeaders,
            })),
            {
              label: "TOTAL",
              male: primary.data.genderTotals.male,
              female: primary.data.genderTotals.female,
              total: primary.data.totals.vgLeaders,
              bold: true,
            },
          ]}
        />
      </Page>

      <Page size="A4" orientation="landscape" style={styles.page}>
        <ComparisonTable
          title="Goals"
          col1Header="ACTUAL"
          col2Header="GOAL"
          diffHeader="DIFFERENCE"
          rows={[
            { label: "VICTORY GROUP LEADERS", val1: primary.data.totals.vgLeaders, val2: primary.data.goals.vgLeaders },
            { label: "LEADERSHIP GROUP LEADERS", val1: primary.data.totals.leadershipGroups, val2: primary.data.goals.leadershipGroups },
          ]}
        />
      </Page>

      {convergence.length > 0 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <ConvergenceTable entries={convergence} />
        </Page>
      )}

      {leadership113.length > 0 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Leadership113Table batches={leadership113} />
        </Page>
      )}

      <Page size="A4" orientation="landscape" style={styles.darkPage}>
        <View style={styles.darkDividerSlide}>
          <Text style={styles.darkDividerTitle}>DATA PER SERVICE TIME</Text>
          <View style={styles.darkDividerRule} />
        </View>
      </Page>

      {SERVICE_BUCKETS.map((bucket: VgServiceBucket) => (
        <Page key={bucket} size="A4" orientation="landscape" style={styles.darkPage}>
          <ComparisonTable
            theme="dark"
            title={bucket}
            col1Header={col1}
            col2Header={col2}
            rows={METRIC_LABELS.map((m) => ({
              label: m.label,
              val1: primary.data.byService[bucket][m.key],
              val2: compare ? compare.data.byService[bucket][m.key] : null,
            }))}
          />
        </Page>
      ))}
    </Document>
  );
}
