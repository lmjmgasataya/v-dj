import Link from "next/link";
import { getBatchStudents, getL113Batches, pickBatch } from "@/lib/l113Data";
import { BatchPicker } from "@/components/BatchPicker";
import { PrintButton } from "@/components/L113StudentQr";
import { Card, L113Header, NoBatches } from "../ui";
import { StudentQrGrid } from "./StudentQrGrid";

export default async function L113QrCodesPage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { batch: batchParam } = await searchParams;
  const batches = await getL113Batches();
  const batch = pickBatch(batches, batchParam);
  const students = batch ? await getBatchStudents(batch.id) : [];

  return (
    <>
      <div className="flex items-end justify-between gap-4 print:hidden">
        <L113Header
          title="Student QR Codes"
          description="Students scan these at L113 check-in. They can also open theirs on the VG Leader Portal. Tap a code to show it bigger, or use Save image to download it."
        />
        {students.length > 0 && <PrintButton />}
      </div>
      {!batch ? (
        <NoBatches />
      ) : (
        <>
          <div className="print:hidden">
            <BatchPicker batches={batches} selectedId={batch.id} />
          </div>
          {students.length === 0 ? (
            <Card>
              <p className="px-6 py-8 text-sm text-gray-500 text-center">
                {batch.name} has no students yet.{" "}
                <Link href={`/l113-portal/batches/${batch.id}`} className="text-indigo-600 font-medium hover:underline">
                  Add students
                </Link>{" "}
                first.
              </p>
            </Card>
          ) : (
            <StudentQrGrid batchName={batch.name} students={students} />
          )}
        </>
      )}
    </>
  );
}
