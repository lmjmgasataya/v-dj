import { db } from "@/db";
import { victoryGroupLeaders, users } from "@/db/schema";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { SERVICE_OPTIONS } from "@/components/form";
import type { SessionPayload } from "@/lib/auth";
import { rawServiceValues } from "@/lib/timeService";
import { NOT_SET_SERVICE } from "@/lib/vglProfileNotCompleted";
import type { L113CandidateRow } from "./L113CandidatesTable";

const SERVICE_ORDER: string[] = [...SERVICE_OPTIONS, NOT_SET_SERVICE];

const EMPOWERING_LEADERS = "Empowering Leaders";

/**
 * Discipleship Journey steps that make a leader ready for Leadership 113. Spiritual
 * Foundations is the newer class that replaces Church Community + Purple Book Class, so
 * either path counts.
 */
function isDoneWithDiscipleshipJourney(completed: Set<string>): boolean {
  const core = ["One2One", "Victory Weekend/Victory Day", "Making Disciples"].every((s) => completed.has(s));
  const foundations =
    completed.has("Spiritual Foundations") || (completed.has("Church Community") && completed.has("Purple Book Class"));
  return core && foundations;
}

/**
 * Potential Leadership 113 students — claimed VG leaders (a PIN reset still counts) who are
 * actively leading, haven't graduated from L113, and are done with the Discipleship Journey.
 * Shared by the report page and its Excel export. A lead_pastor only sees their own service.
 */
export async function getL113CandidateRows(session: SessionPayload | null): Promise<L113CandidateRow[]> {
  const lockedServiceRawValues = session?.role === "lead_pastor" ? rawServiceValues(session?.timeService) : undefined;

  const [allLeaders, claimedAccounts] = await Promise.all([
    db
      .select()
      .from(victoryGroupLeaders)
      .where(
        and(
          isNull(victoryGroupLeaders.deletedAt),
          eq(victoryGroupLeaders.isActive, true),
          lockedServiceRawValues ? inArray(victoryGroupLeaders.serviceAttending, lockedServiceRawValues) : undefined
        )
      ),
    db
      .select({ vgLeaderId: users.vgLeaderId })
      .from(users)
      .where(eq(users.role, "vg_leader")),
  ]);

  const claimedIds = new Set(claimedAccounts.map((a) => a.vgLeaderId));

  return allLeaders
    .filter((l) => claimedIds.has(l.id) && l.graduateOfLeadership113 !== "yes")
    .map((l) => ({ leader: l, completed: new Set((l.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean)) }))
    .filter(({ completed }) => isDoneWithDiscipleshipJourney(completed))
    .map(({ leader: l, completed }) => {
      const service = l.serviceAttending || NOT_SET_SERVICE;
      const rank = SERVICE_ORDER.indexOf(service);
      return {
        id: l.id,
        name: `${l.lastName}, ${l.firstName}`,
        service,
        serviceRank: rank === -1 ? SERVICE_ORDER.length : rank,
        doneWithJourney: true,
        empoweringLeaders: completed.has(EMPOWERING_LEADERS),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
