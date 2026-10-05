import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, interns, leadershipGroupMembers, participants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { NetworkGraph } from "./NetworkGraph";
import type { GraphLink, GraphNode } from "./graphTypes";

export const metadata: Metadata = {
  title: "Connections Graph — Victory Iloilo",
  robots: { index: false, follow: false },
};

/**
 * The whole VG leader network as a zoomable graph: leaders, the participants and interns under
 * them, and every link between them. Developer-only and not linked from any nav — reached by
 * typing /vg-leader-portal/graph (also gated in src/proxy.ts).
 */
export default async function ConnectionsGraphPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const [leaders, lglRows, participantRows, internRows] = await Promise.all([
    db
      .select({
        id: victoryGroupLeaders.id,
        lastName: victoryGroupLeaders.lastName,
        firstName: victoryGroupLeaders.firstName,
        ownVgLeaderId: victoryGroupLeaders.ownVgLeaderId,
        isLeadershipGroupLeader: victoryGroupLeaders.isLeadershipGroupLeader,
        serviceAttending: victoryGroupLeaders.serviceAttending,
      })
      .from(victoryGroupLeaders)
      .where(isNull(victoryGroupLeaders.deletedAt)),
    db.select({ leaderId: leadershipGroupMembers.leaderId, memberId: leadershipGroupMembers.memberVgLeaderId }).from(leadershipGroupMembers),
    db
      .select({
        id: participants.id,
        lastName: participants.lastName,
        firstName: participants.firstName,
        vgLeaderId: participants.vgLeaderId,
        disciplerId: participants.disciplerId,
      })
      .from(participants)
      .where(and(isNull(participants.deletedAt), or(isNotNull(participants.vgLeaderId), isNotNull(participants.disciplerId)))),
    db
      .select({ id: interns.id, lastName: interns.lastName, firstName: interns.firstName, vgLeaderId: victoryGroups.vgLeaderId })
      .from(interns)
      .innerJoin(victoryGroups, eq(interns.victoryGroupId, victoryGroups.id))
      .where(and(isNull(interns.deletedAt), isNull(victoryGroups.deletedAt))),
  ]);

  const leaderIds = new Set(leaders.map((l) => l.id));
  const L = (id: number) => `l:${id}`;
  const nodes: GraphNode[] = leaders.map((l) => ({
    id: L(l.id),
    kind: "leader",
    label: `${l.lastName}, ${l.firstName}`,
    href: `/vg-leader-portal/leaders/${l.id}`,
    isLgl: l.isLeadershipGroupLeader,
    service: l.serviceAttending,
  }));
  const links: GraphLink[] = [];
  // Only link to leaders that are still in the graph (not soft-deleted).
  const link = (from: number | null, target: string, kind: GraphLink["kind"]) => {
    if (from != null && leaderIds.has(from)) links.push({ source: L(from), target, kind });
  };

  for (const l of leaders) link(l.ownVgLeaderId, L(l.id), "vgLeader");
  for (const r of lglRows) if (leaderIds.has(r.memberId)) link(r.leaderId, L(r.memberId), "lgl");
  for (const p of participantRows) {
    const id = `p:${p.id}`;
    nodes.push({ id, kind: "participant", label: `${p.lastName}, ${p.firstName}`, href: `/participants/${p.id}` });
    link(p.vgLeaderId, id, "participantVgl");
    link(p.disciplerId, id, "participantDiscipler");
  }
  for (const i of internRows) {
    const id = `i:${i.id}`;
    nodes.push({ id, kind: "intern", label: `${i.lastName}, ${i.firstName}` });
    link(i.vgLeaderId, id, "intern");
  }

  return (
    // Break out of the root layout's max-w-5xl column to (almost) the full window width.
    <div className="relative left-1/2 flex w-[98vw] -translate-x-1/2 flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "VG Leader Portal", href: "/vg-leader-portal" },
          { label: "Connections Graph" },
        ]}
      />
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Connections Graph</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Every VG leader and who they&apos;re connected to. Scroll or pinch to zoom, drag to pan, click a person to see their
          connections.
        </p>
      </div>
      <NetworkGraph nodes={nodes} links={links} />
    </div>
  );
}
