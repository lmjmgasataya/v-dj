"use client";

import { useEffect, useState } from "react";
import { addOwnVictoryGroup, updateOwnVictoryGroup, deleteOwnVictoryGroup } from "./actions";
import { VictoryGroupsPanel } from "@/components/VictoryGroupsPanel";
import type { VictoryGroup } from "@/db/schema";

type InternRow = { lastName: string; firstName: string };

export function MyVictoryGroups({
  groups,
  internsByGroup,
  isLeadershipGroupLeader,
  readOnly = false,
  onDirtyChange,
}: {
  groups: VictoryGroup[];
  internsByGroup: Record<number, InternRow[]>;
  isLeadershipGroupLeader: boolean;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const victoryGroups = groups.filter((g) => g.type !== "leadership_group");
  const leadershipGroups = groups.filter((g) => g.type === "leadership_group");

  const [vgDirty, setVgDirty] = useState(false);
  const [lglDirty, setLglDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(vgDirty || lglDirty);
  }, [vgDirty, lglDirty, onDirtyChange]);

  return (
    <div className="flex flex-col gap-6">
      <VictoryGroupsPanel
        groups={victoryGroups}
        internsByGroup={internsByGroup}
        groupType="victory_group"
        title="My Victory Groups"
        variant="portal"
        readOnly={readOnly}
        onDirtyChange={setVgDirty}
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
          readOnly={readOnly}
          onDirtyChange={setLglDirty}
          onAdd={addOwnVictoryGroup}
          onUpdate={updateOwnVictoryGroup}
          onDelete={deleteOwnVictoryGroup}
        />
      )}
    </div>
  );
}
