import { db } from "@/db";
import {
  victoryGroupLeaders,
  victoryGroups,
  leadershipGroupMembers,
  participants,
  eventRegistrations,
  eventCheckIns,
  events,
  users,
} from "@/db/schema";
import { eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface ConnectionItem {
  key: string;
  label: string;
  href?: string;
}

export interface ConnectionGroup {
  label: string;
  items: ConnectionItem[];
}

const otherLeaders = alias(victoryGroupLeaders, "other_leaders");

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

const deletedTag = (deletedAt: Date | null) => (deletedAt ? " (deleted)" : "");

/**
 * Every row (deleted or not) that still references each of the given leader records via a
 * foreign key — anything listed here would block a hard delete. Keyed by leader id; leaders
 * with no remaining references get an empty list.
 */
export async function getRemainingConnections(leaderIds: number[]): Promise<Map<number, ConnectionGroup[]>> {
  const result = new Map<number, ConnectionGroup[]>(leaderIds.map((id) => [id, []]));
  if (leaderIds.length === 0) return result;

  const [participantRows, groupRows, namedByRows, lgmRows, regRows, checkInRows, accountRows] = await Promise.all([
    db
      .select({
        id: participants.id,
        lastName: participants.lastName,
        firstName: participants.firstName,
        deletedAt: participants.deletedAt,
        vgLeaderId: participants.vgLeaderId,
        disciplerId: participants.disciplerId,
      })
      .from(participants)
      .where(or(inArray(participants.vgLeaderId, leaderIds), inArray(participants.disciplerId, leaderIds)))
      .orderBy(participants.lastName, participants.firstName),
    db
      .select()
      .from(victoryGroups)
      .where(inArray(victoryGroups.vgLeaderId, leaderIds))
      .orderBy(victoryGroups.createdAt),
    db
      .select({
        id: victoryGroupLeaders.id,
        lastName: victoryGroupLeaders.lastName,
        firstName: victoryGroupLeaders.firstName,
        deletedAt: victoryGroupLeaders.deletedAt,
        ownVgLeaderId: victoryGroupLeaders.ownVgLeaderId,
      })
      .from(victoryGroupLeaders)
      .where(inArray(victoryGroupLeaders.ownVgLeaderId, leaderIds))
      .orderBy(victoryGroupLeaders.lastName, victoryGroupLeaders.firstName),
    db
      .select({
        id: leadershipGroupMembers.id,
        leaderId: leadershipGroupMembers.leaderId,
        memberVgLeaderId: leadershipGroupMembers.memberVgLeaderId,
        otherId: otherLeaders.id,
        otherLastName: otherLeaders.lastName,
        otherFirstName: otherLeaders.firstName,
        otherDeletedAt: otherLeaders.deletedAt,
      })
      .from(leadershipGroupMembers)
      .innerJoin(
        otherLeaders,
        or(
          // The "other side" of the link from the deleted leader's point of view.
          eq(otherLeaders.id, leadershipGroupMembers.leaderId),
          eq(otherLeaders.id, leadershipGroupMembers.memberVgLeaderId),
        ),
      )
      .where(or(inArray(leadershipGroupMembers.leaderId, leaderIds), inArray(leadershipGroupMembers.memberVgLeaderId, leaderIds))),
    db
      .select({ id: eventRegistrations.id, vgLeaderId: eventRegistrations.vgLeaderId, eventId: events.id, eventName: events.name })
      .from(eventRegistrations)
      .innerJoin(events, eq(eventRegistrations.eventId, events.id))
      .where(inArray(eventRegistrations.vgLeaderId, leaderIds)),
    db
      .select({ id: eventCheckIns.id, vgLeaderId: eventCheckIns.vgLeaderId, eventId: events.id, eventName: events.name })
      .from(eventCheckIns)
      .innerJoin(events, eq(eventCheckIns.eventId, events.id))
      .where(inArray(eventCheckIns.vgLeaderId, leaderIds)),
    db
      .select({ id: users.id, vgLeaderId: users.vgLeaderId, name: users.name, username: users.username, hasPin: users.pinHash })
      .from(users)
      .where(inArray(users.vgLeaderId, leaderIds)),
  ]);

  const buckets = new Map<number, Map<string, ConnectionItem[]>>();
  const add = (leaderId: number | null, group: string, item: ConnectionItem) => {
    if (leaderId == null || !result.has(leaderId)) return;
    const byGroup = buckets.get(leaderId) ?? new Map<string, ConnectionItem[]>();
    byGroup.set(group, [...(byGroup.get(group) ?? []), item]);
    buckets.set(leaderId, byGroup);
  };

  for (const a of accountRows) {
    add(a.vgLeaderId, "Portal account", {
      key: `u${a.id}`,
      label: `${a.username ?? a.name} (${a.hasPin ? "PIN set" : "no PIN"})`,
    });
  }
  for (const p of participantRows) {
    const item = {
      key: `p${p.id}`,
      label: `${p.lastName}, ${p.firstName}${deletedTag(p.deletedAt)}`,
      href: `/participants/${p.id}/edit`,
    };
    add(p.vgLeaderId, "Participants (as VG Leader)", item);
    add(p.disciplerId, "Participants (as Discipler)", item);
  }
  for (const g of groupRows) {
    add(g.vgLeaderId, g.type === "leadership_group" ? "Leadership Groups" : "Victory Groups", {
      key: `g${g.id}`,
      label: `${g.name ? `${g.name} · ` : ""}${g.place} · ${DAY_ABBR[g.day] ?? g.day} ${g.time}${deletedTag(g.deletedAt)}`,
    });
  }
  for (const l of namedByRows) {
    add(l.ownVgLeaderId, "VG Leaders who named them as their VG Leader", {
      key: `o${l.id}`,
      label: `${l.lastName}, ${l.firstName}${deletedTag(l.deletedAt)}`,
      href: `/vg-leader-portal/leaders/${l.id}`,
    });
  }
  for (const r of lgmRows) {
    const item = {
      key: `m${r.id}`,
      label: `${r.otherLastName}, ${r.otherFirstName}${deletedTag(r.otherDeletedAt)}`,
      href: `/vg-leader-portal/leaders/${r.otherId}`,
    };
    // Each link row joins twice (once per side); keep only the side that isn't the deleted leader.
    if (r.otherId === r.memberVgLeaderId && r.otherId !== r.leaderId) add(r.leaderId, "VG Leaders they lead (Leadership Group)", item);
    if (r.otherId === r.leaderId && r.otherId !== r.memberVgLeaderId) add(r.memberVgLeaderId, "Their Leadership Group Leader", item);
    if (r.leaderId === r.memberVgLeaderId) add(r.leaderId, "Leadership Group (listed as their own member)", item);
  }
  for (const r of regRows) {
    add(r.vgLeaderId, "Event registrations", { key: `r${r.id}`, label: r.eventName, href: `/event-registration/events/${r.eventId}` });
  }
  for (const c of checkInRows) {
    add(c.vgLeaderId, "Event check-ins", { key: `c${c.id}`, label: c.eventName, href: `/event-registration/events/${c.eventId}` });
  }

  for (const [leaderId, byGroup] of buckets) {
    result.set(leaderId, Array.from(byGroup.entries()).map(([label, items]) => ({ label, items })));
  }
  return result;
}
