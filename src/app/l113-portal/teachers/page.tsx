import { db } from "@/db";
import { l113Schedules, l113Teachers } from "@/db/schema";
import { asc, count, eq } from "drizzle-orm";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmDeleteButton } from "@/app/sessions/batches/ConfirmDeleteButton";
import { Card, CardHeader, L113Header, l113Input, l113PrimaryButton } from "../ui";
import { createL113Teacher, deleteL113Teacher, updateL113Teacher } from "./actions";

export default async function L113TeachersPage() {
  const teachers = await db
    .select({ id: l113Teachers.id, name: l113Teachers.name, topics: count(l113Schedules.id) })
    .from(l113Teachers)
    .leftJoin(l113Schedules, eq(l113Schedules.teacherId, l113Teachers.id))
    .groupBy(l113Teachers.id)
    .orderBy(asc(l113Teachers.name));

  return (
    <>
      <L113Header title="Teachers" description="Teachers and facilitators you can pick when adding a topic to the schedule." />
      <Card>
        <CardHeader title="Teachers / Facilitators" subtitle={`${teachers.length} teacher${teachers.length === 1 ? "" : "s"}`} />
        {teachers.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {teachers.map((t) => (
              <li key={t.id} className="px-6 py-3 flex flex-wrap items-center gap-3">
                {/* key=name so the field resets to the saved name after a rename. */}
                <form key={t.name} action={updateL113Teacher} className="flex flex-1 min-w-60 items-center gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <input name="name" required defaultValue={t.name} aria-label="Teacher name" className={`${l113Input} flex-1`} />
                  <SubmitButton label="Save" pendingLabel="Saving…" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-60" />
                </form>
                <span className="text-xs text-gray-500 w-20">
                  {t.topics} topic{t.topics === 1 ? "" : "s"}
                </span>
                <ConfirmDeleteButton action={deleteL113Teacher} hiddenFields={{ id: String(t.id) }} message={`Delete ${t.name}?`} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No teachers yet. Add one below.</p>
        )}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
          <form key={teachers.length} action={createL113Teacher} className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-60">
              <span className="block text-xs text-gray-500 mb-1">Add Teacher / Facilitator</span>
              <input name="name" required placeholder="Full name" className={l113Input} />
            </label>
            <SubmitButton label="Add" pendingLabel="Adding…" className={l113PrimaryButton} />
          </form>
        </div>
      </Card>
    </>
  );
}
