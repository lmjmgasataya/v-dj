import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditForm } from "./EditForm";
import { DeleteButton } from "./DeleteButton";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const participantId = parseInt(id, 10);

  const [participant] = await db
    .select()
    .from(participants)
    .where(eq(participants.id, participantId))
    .limit(1);

  if (!participant) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Participant</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {participant.lastName}, {participant.firstName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href="/participants" className="text-sm text-indigo-600 hover:underline">
            ← Back to list
          </Link>
          <DeleteButton
            id={participant.id}
            name={`${participant.lastName}, ${participant.firstName}`}
          />
        </div>
      </div>
      <EditForm participant={participant} />
    </div>
  );
}
