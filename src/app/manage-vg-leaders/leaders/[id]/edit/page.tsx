import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EditForm } from "./EditForm";
import { DeleteButton } from "./DeleteButton";
import { VictoryGroupsSection } from "./VictoryGroupsSection";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function EditVGLeaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leaderId = parseInt(id, 10);

  const [[leader], groups] = await Promise.all([
    db
      .select()
      .from(victoryGroupLeaders)
      .where(eq(victoryGroupLeaders.id, leaderId))
      .limit(1),

    db
      .select()
      .from(victoryGroups)
      .where(and(eq(victoryGroups.vgLeaderId, leaderId), isNull(victoryGroups.deletedAt)))
      .orderBy(victoryGroups.createdAt),
  ]);

  if (!leader) notFound();

  return (
    <div>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Manage VG Leaders", href: "/manage-vg-leaders" }, { label: "VG Leaders", href: "/manage-vg-leaders/leaders" }, { label: `${leader.lastName}, ${leader.firstName}` }]} />
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit VG Leader</h2>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {leader.lastName}, {leader.firstName}
            </p>
          </div>
          <DeleteButton
            id={leader.id}
            name={`${leader.lastName}, ${leader.firstName}`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <EditForm leader={leader} />
        <VictoryGroupsSection groups={groups} vgLeaderId={leaderId} />
      </div>
    </div>
  );
}
