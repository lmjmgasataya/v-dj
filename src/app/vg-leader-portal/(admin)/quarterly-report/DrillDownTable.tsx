import type { DrillItem } from "@/lib/vgSnapshot";

// Victory Group labels are "<leader> — <day time> @ <venue>" (see vgSnapshotCompute / formSnapshot).
const GROUP_LABEL = /^(.*?) — (.*?) @ (.*)$/;

/**
 * The names behind a quarterly-report number, as a numbered table sorted A–Z, with each
 * one's service. When every item is a Victory Group label, it's split into Leader /
 * Schedule / Venue columns. The Service column is left out when no item has one.
 */
export function DrillDownTable({ items, emptyText }: { items: DrillItem[]; emptyText: string }) {
  const sorted = [...items].sort((a, b) => a.label.localeCompare(b.label));
  const asGroups = sorted.length > 0 && sorted.every((i) => GROUP_LABEL.test(i.label));
  const showService = sorted.some((i) => i.service);
  const headers = [...(asGroups ? ["Leader", "Schedule", "Venue"] : ["Name"]), ...(showService ? ["Service"] : [])];
  const cells = (item: DrillItem) => [
    ...(asGroups ? GROUP_LABEL.exec(item.label)!.slice(1, 4) : [item.label]),
    ...(showService ? [item.service || "—"] : []),
  ];

  if (sorted.length === 0) {
    return <p className="px-5 py-6 text-sm text-gray-400 text-center">{emptyText}</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          <th className="w-10 px-3 py-2 text-right font-medium">#</th>
          {headers.map((h) => (
            <th key={h} className="px-3 py-2 text-left font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {sorted.map((item, i) => (
          <tr key={i} className="hover:bg-gray-50 align-top">
            <td className="px-3 py-2 text-right text-xs text-gray-400 tabular-nums">{i + 1}</td>
            {cells(item).map((c, j) => (
              <td
                key={j}
                className={`px-3 py-2 ${j === 0 ? "text-gray-800" : "text-gray-600"} ${(asGroups && j === 1) || (showService && j === headers.length - 1) ? "whitespace-nowrap" : ""}`}
              >
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
