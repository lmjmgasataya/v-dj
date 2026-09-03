"use client";

import { addOwnVictoryGroup, updateOwnVictoryGroup, deleteOwnVictoryGroup } from "./actions";
import { VictoryGroupsPanel } from "@/components/VictoryGroupsPanel";
import type { VictoryGroup } from "@/db/schema";

type InternRow = { lastName: string; firstName: string };

export function MyVictoryGroups({
  groups,
  internsByGroup,
  isLeadershipGroupLeader,
}: {
  groups: VictoryGroup[];
  internsByGroup: Record<number, InternRow[]>;
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
        title="My Victory Groups"
        variant="portal"
        onAdd={addOwnVictoryGroup}
        onUpdate={updateOwnVictoryGroup}
        onDelete={deleteOwnVictoryGroup}
      />
      {isLeadershipGroupLeader && (
        <VictoryGroupsPanel
          groups={leadershipGroups}
          internsByGroup={internsByGroup}
          groupType="leadership_group"
          title="My Leadership Groups"
          addButtonLabel="+ Add Leadership Group"
          saveLabel="Add Leadership Group"
          emptyLabel="No leadership groups yet."
          rowLabel="Leadership Group"
          variant="portal"
          onAdd={addOwnVictoryGroup}
          onUpdate={updateOwnVictoryGroup}
          onDelete={deleteOwnVictoryGroup}
        />
      )}
    </div>
  );
}
