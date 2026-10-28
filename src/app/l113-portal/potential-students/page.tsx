import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { L113CandidatesTable } from "./L113CandidatesTable";
import { getL113CandidateRows } from "./candidateRows";

export default async function L113CandidatesReportPage() {
  const authSession = await getSession();
  const rows = await getL113CandidateRows(authSession);
  const empoweringLeadersDone = rows.filter((r) => r.empoweringLeaders).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "L113 Portal", href: "/l113-portal" },
            { label: "Potential L113 Students" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Potential L113 Students</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Actively leading VG leaders done with the Discipleship Journey who haven&apos;t taken Leadership 113.
        </p>
      </div>
      <p className="text-sm text-gray-500 -mt-2">
        {rows.length} potential student{rows.length !== 1 ? "s" : ""} · {empoweringLeadersDone} done with Empowering
        Leaders · {rows.length - empoweringLeadersDone} not done
      </p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Potential Leadership 113 Students</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Claimed VG leaders who are actively leading, haven&apos;t graduated from or started L113, and have completed One2One, Victory
              Weekend/Victory Day, Making Disciples, and either Spiritual Foundations or Church Community + Purple Book
              Class.
            </p>
          </div>
          {rows.length > 0 && (
            <a
              href="/l113-portal/potential-students/export"
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              ⬇ Download Excel
            </a>
          )}
        </div>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <L113CandidatesTable rows={rows} />
          </div>
        ) : (
          <p className="px-6 py-4 text-sm text-gray-500">No potential L113 students found.</p>
        )}
      </div>
    </div>
  );
}
