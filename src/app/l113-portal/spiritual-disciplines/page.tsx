import { db } from "@/db";
import { l113SpiritualDisciplines } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getBatchStudents, getL113Batches, pickBatch } from "@/lib/l113Data";
import { batchMonths, defaultBatchMonth, formatMonth, SPIRITUAL_DISCIPLINE_QUESTIONS, STUDENT_SPIRITUAL_DISCIPLINES_PATH } from "@/lib/l113";
import { TZ, todayPH } from "@/lib/date";
import { BatchPicker } from "@/components/BatchPicker";
import { Card, CardHeader, L113Header, NoBatches } from "../ui";
import { CopyLinkButton } from "../CopyLinkButton";
import { ParamSelect } from "../ParamSelect";

export default async function L113SpiritualDisciplinesPage({ searchParams }: { searchParams: Promise<{ batch?: string; month?: string }> }) {
  const { batch: batchParam, month: monthParam } = await searchParams;
  const batches = await getL113Batches();
  const batch = pickBatch(batches, batchParam);

  if (!batch) {
    return (
      <>
        <L113Header title="Spiritual Disciplines Calendar" />
        <NoBatches />
      </>
    );
  }

  const months = batchMonths(batch.startDate, batch.endDate);
  const month = monthParam && months.includes(monthParam) ? monthParam : defaultBatchMonth(months, todayPH());

  const [students, entries] = await Promise.all([
    getBatchStudents(batch.id),
    db
      .select()
      .from(l113SpiritualDisciplines)
      .where(and(eq(l113SpiritualDisciplines.batchId, batch.id), eq(l113SpiritualDisciplines.month, month))),
  ]);
  const byStudent = new Map(entries.map((e) => [e.vgLeaderId, e]));
  const totals = SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => entries.reduce((sum, e) => sum + e[q.key], 0));

  return (
    <>
      <L113Header
        title="Spiritual Disciplines Calendar"
        description="Students encode their monthly report through one shared link: they pick their name, the month, then answer."
      />
      <BatchPicker batches={batches} selectedId={batch.id} />
      <ParamSelect
        label="Month"
        hrefPrefix={`/l113-portal/spiritual-disciplines?batch=${batch.id}&month=`}
        value={month}
        options={months.map((m) => ({ value: m, label: formatMonth(m) }))}
      />

      <Card>
        <CardHeader title={`${formatMonth(month)} · ${batch.name}`} subtitle={`${entries.length} of ${students.length} students submitted`}>
          <CopyLinkButton path={STUDENT_SPIRITUAL_DISCIPLINES_PATH} />
        </CardHeader>
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left font-medium uppercase">Name of Student</th>
                  {SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => (
                    <th key={q.key} className="px-3 py-2 text-center font-medium max-w-40">
                      {q.label}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-left font-medium uppercase">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s) => {
                  const e = byStudent.get(s.vgLeaderId);
                  return (
                    <tr key={s.vgLeaderId} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-800">{s.name}</td>
                      {SPIRITUAL_DISCIPLINE_QUESTIONS.map((q) => (
                        <td key={q.key} className="px-3 py-2.5 text-center text-gray-700">
                          {e ? e[q.key] : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-xs">
                        {e ? (
                          <span className="text-gray-500">
                            {e.updatedAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: TZ })}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Not yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {entries.length > 0 && (
                <tfoot className="bg-gray-50 font-semibold text-gray-700">
                  <tr>
                    <td className="px-4 py-2.5">Total</td>
                    {totals.map((t, i) => (
                      <td key={i} className="px-3 py-2.5 text-center">
                        {t}
                      </td>
                    ))}
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">This batch has no students yet.</p>
        )}
      </Card>
    </>
  );
}
