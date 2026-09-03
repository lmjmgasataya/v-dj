"use client";

import { addVictoryGroup, updateVictoryGroup, deleteVictoryGroup } from "./victoryGroupActions";
import { VictoryGroupsPanel } from "@/components/VictoryGroupsPanel";
import type { VictoryGroup } from "@/db/schema";

type InternRow = { lastName: string; firstName: string };

export function VictoryGroupsSection({
  groups,
  internsByGroup,
  vgLeaderId,
  isLeadershipGroupLeader,
}: {
  groups: VictoryGroup[];
  internsByGroup: Record<number, InternRow[]>;
  vgLeaderId: number;
  isLeadershipGroupLeader: boolean;
}) {
  const victoryGroups = groups.filter((g) => g.type !== "leadership_group");
  const leadershipGroups = groups.filter((g) => g.type === "leadership_group");

  return (
    <div className="flex flex-col gap-6">
      <VictoryGroupsPanel
        groups={victoryGroups}
        internsByGroup={internsByGroup}
        groupType="victory_group"
        title="Victory Groups"
        variant="admin"
        onAdd={(formData) => addVictoryGroup(vgLeaderId, formData)}
        onUpdate={(id, formData) => updateVictoryGroup(id, vgLeaderId, formData)}
        onDelete={(id) => deleteVictoryGroup(id, vgLeaderId)}
      />
      {isLeadershipGroupLeader && (
        <VictoryGroupsPanel
          groups={leadershipGroups}
          internsByGroup={internsByGroup}
          groupType="leadership_group"
          title="Leadership Groups"
          addButtonLabel="+ Add Leadership Group"
          saveLabel="Add Leadership Group"
          emptyLabel="No leadership groups yet."
          rowLabel="Leadership Group"
          variant="admin"
          onAdd={(formData) => addVictoryGroup(vgLeaderId, formData)}
          onUpdate={(id, formData) => updateVictoryGroup(id, vgLeaderId, formData)}
          onDelete={(id) => deleteVictoryGroup(id, vgLeaderId)}
        />
      )}
    </div>
  );
}
