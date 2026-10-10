import { db } from "@/db";
import { victoryGroupLeaders, users } from "@/db/schema";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { DISCIPLESHIP_JOURNEY_STEPS, SERVICE_OPTIONS } from "@/components/form";
import type { SessionPayload } from "@/lib/auth";
import { rawServiceValues } from "@/lib/timeService";
import { NOT_SET_SERVICE } from "@/lib/vglProfileNotCompleted";
import type { DiscipleshipJourneyRow } from "./DiscipleshipJourneyTable";

const SERVICE_ORDER: string[] = [...SERVICE_OPTIONS, NOT_SET_SERVICE];

/**
 * One row per claimed VG leader (a PIN reset still counts as claimed) with the Discipleship
 * Journey steps they've completed — shared by the report page and its Excel export. A
 * lead_pastor only sees leaders in their own service.
 */
export async function getDiscipleshipJourneyRows(session: SessionPayload | null): Promise<DiscipleshipJourneyRow[]> {
  const lockedServiceRawValues = session?.role === "lead_pastor" ? rawServiceValues(session?.timeService) : undefined;

  const [allLeaders, claimedAccounts] = await Promise.all([
    db
      .select()
      .from(victoryGroupLeaders)
      .where(
        and(
          isNull(victoryGroupLeaders.deletedAt),
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
    .filter((l) => claimedIds.has(l.id))
    .map((l) => {
      const completed = new Set((l.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean));
      const service = l.serviceAttending || NOT_SET_SERVICE;
      const rank = SERVICE_ORDER.indexOf(service);
      return {
        id: l.id,
        name: `${l.lastName}, ${l.firstName}`,
        service,
        serviceRank: rank === -1 ? SERVICE_ORDER.length : rank,
        leadership113: l.graduateOfLeadership113,
        steps: Object.fromEntries(DISCIPLESHIP_JOURNEY_STEPS.map((step) => [step, completed.has(step)])),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
