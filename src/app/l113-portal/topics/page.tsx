import { db } from "@/db";
import { l113Schedules, l113Topics } from "@/db/schema";
import { asc, count, eq } from "drizzle-orm";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmDeleteButton } from "@/app/sessions/batches/ConfirmDeleteButton";
import { Card, CardHeader, L113Header, l113Input, l113PrimaryButton } from "../ui";
import { createL113Topic, deleteL113Topic, updateL113Topic } from "./actions";

export default async function L113TopicsPage() {
  const topics = await db
    .select({ id: l113Topics.id, name: l113Topics.name, uses: count(l113Schedules.id) })
    .from(l113Topics)
    .leftJoin(l113Schedules, eq(l113Schedules.topicId, l113Topics.id))
    .groupBy(l113Topics.id)
    .orderBy(asc(l113Topics.name));

  return (
    <>
      <L113Header title="Topics" description="Topic names you can pick on the schedule. Typing a new topic on the schedule adds it here too." crumbs={[{ label: "Schedule", href: "/l113-portal/schedule" }]} />
      <Card>
        <CardHeader title="Topics" subtitle={`${topics.length} topic${topics.length === 1 ? "" : "s"}`} />
        {topics.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {topics.map((t) => (
              <li key={t.id} className="px-6 py-3 flex flex-wrap items-center gap-3">
                {/* key=name so the field resets to the saved name after a rename. */}
                <form key={t.name} action={updateL113Topic} className="flex flex-1 min-w-60 items-center gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <input name="name" required defaultValue={t.name} aria-label="Topic name" className={`${l113Input} flex-1`} />
                  <SubmitButton label="Save" pendingLabel="Saving…" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-60" />
                </form>
                <span className="text-xs text-gray-500 w-24">
                  {t.uses === 0 ? "Unused" : `${t.uses} schedule${t.uses === 1 ? "" : "s"}`}
                </span>
                <ConfirmDeleteButton action={deleteL113Topic} hiddenFields={{ id: String(t.id) }} message={`Delete "${t.name}"?`} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No topics yet. Add one below.</p>
        )}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
          <form key={topics.length} action={createL113Topic} className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-60">
              <span className="block text-xs text-gray-500 mb-1">Add Topic</span>
              <input name="name" required placeholder="Topic name" className={l113Input} />
            </label>
            <SubmitButton label="Add" pendingLabel="Adding…" className={l113PrimaryButton} />
          </form>
        </div>
      </Card>
    </>
  );
}
