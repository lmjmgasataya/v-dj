import { db } from "@/db";
import { participants, disciplers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EditForm } from "./EditForm";
import { DeleteButton } from "./DeleteButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const participantId = parseInt(id, 10);

  const [participant] = await db
    .select({
      ...getTableColumns(participants),
      disciplerLastName: disciplers.lastName,
      disciplerFirstName: disciplers.firstName,
      disciplerMobileNumber: disciplers.mobileNumber,
      disciplerMessengerName: disciplers.messengerName,
    })
    .from(participants)
    .leftJoin(disciplers, eq(participants.disciplerId, disciplers.id))
    .where(eq(participants.id, participantId))
    .limit(1);

  if (!participant) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Participants", href: "/participants" }, { label: `${participant.lastName}, ${participant.firstName}` }]} />
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Participant</h2>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {participant.lastName}, {participant.firstName}
            </p>
          </div>
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
