import { db } from "@/db";
import { victoryGroupLeaders, victoryGroups, interns, leadershipGroupMembers, participants, users, type VictoryGroup } from "@/db/schema";
import { eq, isNull, ne, and, inArray } from "drizzle-orm";
import { areSimilarNames } from "@/lib/vgLeaderMatch";
import { MoveConnectionsButton } from "./MoveConnectionsButton";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DISCIPLESHIP_JOURNEY_STEPS } from "@/components/form";
import { getProfileFreshness, FRESHNESS_BADGE_CLASS } from "@/lib/vgLeaderStatus";
import { leadership113Label } from "@/lib/leadership113";
import { getSession } from "@/lib/auth";

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" });
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value || "—"}</dd>
    </div>
  );
}

type ConnectionLink = { id: number; label: string; href: string | null };
type ConnectionBranch = { label: string; links: ConnectionLink[] };

// Branches with more names than this start collapsed.
const OPEN_BRANCH_MAX = 8;

// Tree lines: each child list draws a vertical rule, each item a short elbow into it.
const treeList = "ml-2 border-l border-gray-300 pl-4 flex flex-col gap-1";
const treeItem = "relative before:absolute before:-left-4 before:top-2.5 before:w-3 before:border-t before:border-gray-300";

function NodeLink({ link }: { link: ConnectionLink }) {
  if (!link.href) return <span className="text-gray-700">{link.label}</span>;
  return (
    <Link href={link.href} className="text-indigo-600 hover:text-indigo-800 hover:underline">
      {link.label}
    </Link>
  );
}

/**
 * Who this leader is connected to, as a tree: the people above them (their Leadership Group
 * Leader and VG Leader), the leader themself, then one branch per kind of connection below.
 */
function ConnectionsTree({ name, above, below }: { name: string; above: ConnectionBranch[]; below: ConnectionBranch[] }) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      {above.length > 0 && (
        <ul className="flex flex-col gap-1">
          {above.map((p) => (
            <li key={p.label} className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-gray-500">{p.label}:</span>
              {p.links.map((l, i) => (
                <span key={l.id}>
                  {i > 0 && <span className="text-gray-400">, </span>}
                  <NodeLink link={l} />
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
      {above.length > 0 && <span aria-hidden className="ml-2 h-3 border-l border-gray-300" />}

      <p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-2.5 py-0.5 font-semibold text-white">
          {name}
        </span>
      </p>

      {below.length > 0 ? (
        <ul className={`${treeList} mt-1`}>
          {below.map((c) => (
            <li key={c.label} className={treeItem}>
              <details open={c.links.length <= OPEN_BRANCH_MAX} className="group">
                <summary className="cursor-pointer select-none list-none font-medium text-gray-700 hover:text-gray-900">
                  <span className="inline-block w-3 text-gray-400 transition group-open:rotate-90">›</span>
                  {c.label} <span className="font-normal text-gray-400">({c.links.length})</span>
                </summary>
                <ul className={`${treeList} mt-1 mb-1`}>
                  {c.links.map((l) => (
                    <li key={l.id} className={treeItem}>
                      <NodeLink link={l} />
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ml-2 text-gray-400">No one below them.</p>
      )}
    </div>
  );
}

export default async function VGLeaderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leaderId = parseInt(id, 10);
  // lead_pastor gets a read-only view.
  const isDeveloper = (await getSession())?.role === "developer";

  const [[leader], groups] = await Promise.all([
    db.select().from(victoryGroupLeaders).where(eq(victoryGroupLeaders.id, leaderId)).limit(1),
    db
      .select()
      .from(victoryGroups)
      .where(and(eq(victoryGroups.vgLeaderId, leaderId), isNull(victoryGroups.deletedAt)))
      .orderBy(victoryGroups.createdAt),
  ]);

  if (!leader) notFound();

  const groupIds = groups.map((g) => g.id);
  const internRows = groupIds.length
    ? await db.select().from(interns).where(and(inArray(interns.victoryGroupId, groupIds), isNull(interns.deletedAt)))
    : [];
  const internsByGroup: Record<number, { lastName: string; firstName: string }[]> = {};
  for (const i of internRows) {
    (internsByGroup[i.victoryGroupId] ??= []).push({ lastName: i.lastName, firstName: i.firstName });
  }

  const completedSteps = (leader.discipleshipJourneyCompleted ?? "").split(",").filter(Boolean);
  const freshness = getProfileFreshness(leader.updatedAt);

  const lglMembers = leader.isLeadershipGroupLeader
    ? await db
        .select({
          id: victoryGroupLeaders.id,
          lastName: victoryGroupLeaders.lastName,
          firstName: victoryGroupLeaders.firstName,
        })
        .from(leadershipGroupMembers)
        .innerJoin(victoryGroupLeaders, eq(leadershipGroupMembers.memberVgLeaderId, victoryGroupLeaders.id))
        .where(eq(leadershipGroupMembers.leaderId, leaderId))
    : [];

  // Everyone who points at this leader record, for the "Connected to" note.
  const participantCols = { id: participants.id, lastName: participants.lastName, firstName: participants.firstName };
  const leaderCols = { id: victoryGroupLeaders.id, lastName: victoryGroupLeaders.lastName, firstName: victoryGroupLeaders.firstName };
  const [vgParticipants, discipledParticipants, ledByLgls, vglsUnderThem] = await Promise.all([
    db
      .select(participantCols)
      .from(participants)
      .where(and(eq(participants.vgLeaderId, leaderId), isNull(participants.deletedAt)))
      .orderBy(participants.lastName, participants.firstName),
    db
      .select(participantCols)
      .from(participants)
      .where(and(eq(participants.disciplerId, leaderId), isNull(participants.deletedAt)))
      .orderBy(participants.lastName, participants.firstName),
    db
      .select(leaderCols)
      .from(leadershipGroupMembers)
      .innerJoin(victoryGroupLeaders, eq(leadershipGroupMembers.leaderId, victoryGroupLeaders.id))
      .where(and(eq(leadershipGroupMembers.memberVgLeaderId, leaderId), isNull(victoryGroupLeaders.deletedAt))),
    db
      .select(leaderCols)
      .from(victoryGroupLeaders)
      .where(and(eq(victoryGroupLeaders.ownVgLeaderId, leaderId), isNull(victoryGroupLeaders.deletedAt)))
      .orderBy(victoryGroupLeaders.lastName, victoryGroupLeaders.firstName),
  ]);

  const toLeaderLink = (l: { id: number; lastName: string; firstName: string }) => ({
    id: l.id,
    label: `${l.lastName}, ${l.firstName}`,
    href: `/vg-leader-portal/leaders/${l.id}`,
  });
  const toParticipantLink = (p: { id: number; lastName: string; firstName: string }) => ({
    id: p.id,
    label: `${p.lastName}, ${p.firstName}`,
    // Participant edit is developer-only — a lead_pastor sees the name without a link.
    href: isDeveloper ? `/participants/${p.id}/edit` : null,
  });
  // Above them in the tree.
  const parentConnections: ConnectionBranch[] = [
    { label: "Their Leadership Group Leader", links: ledByLgls.map(toLeaderLink) },
    {
      label: "Their VG Leader",
      links: leader.ownVgLeaderId
        ? [{ id: leader.ownVgLeaderId, label: leader.ownVgLeaderName || `#${leader.ownVgLeaderId}`, href: `/vg-leader-portal/leaders/${leader.ownVgLeaderId}` }]
        : [],
    },
  ].filter((c) => c.links.length > 0);
  // Below them — the ones that can be moved onto a duplicate record (MoveConnectionsButton).
  const childConnections: ConnectionBranch[] = [
    { label: "VG Leaders they lead (Leadership Group)", links: lglMembers.map(toLeaderLink) },
    { label: "VG Leaders who named them as their VG Leader", links: vglsUnderThem.map(toLeaderLink) },
    { label: "Participants (as VG Leader)", links: vgParticipants.map(toParticipantLink) },
    { label: "Participants (as Discipler)", links: discipledParticipants.map(toParticipantLink) },
  ].filter((c) => c.links.length > 0);

  // Possible duplicates that are the "real" record (claimed + profile complete; a PIN reset still
  // counts as claimed) — the connections above can be moved onto them.
  const claimedCompleted = await db
    .select({ id: victoryGroupLeaders.id, lastName: victoryGroupLeaders.lastName, firstName: victoryGroupLeaders.firstName })
    .from(victoryGroupLeaders)
    .innerJoin(users, eq(users.vgLeaderId, victoryGroupLeaders.id))
    .where(
      and(
        isNull(victoryGroupLeaders.deletedAt),
        eq(victoryGroupLeaders.profileCompleted, true),
        ne(victoryGroupLeaders.id, leaderId),
      ),
    );
  const moveTargets = leader.deletedAt ? [] : claimedCompleted.filter((l) => areSimilarNames(leader, l));
  const hasMovableConnections = childConnections.length > 0 || ledByLgls.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "VG Leader Portal", href: "/vg-leader-portal" },
            { label: "VG Leaders", href: "/vg-leader-portal/leaders" },
            { label: `${leader.lastName}, ${leader.firstName}` },
          ]}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {leader.lastName}, {leader.firstName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {leader.deletedAt && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  Deleted {fmtDate(leader.deletedAt)}
                </span>
              )}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  leader.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {leader.isActive ? "Actively Leading" : "Not Currently Leading"}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  leader.profileCompleted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {leader.profileCompleted ? "Profile Complete" : "Profile Incomplete"}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FRESHNESS_BADGE_CLASS[freshness]}`}>
                Last updated {fmtDate(leader.updatedAt)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Created {fmtDate(leader.createdAt)}</p>
          </div>
          {isDeveloper && (
            <Link
              href={`/vg-leader-portal/leaders/${leader.id}/edit`}
              className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shrink-0"
            >
              Edit
            </Link>
          )}
        </div>
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
          {parentConnections.length === 0 && childConnections.length === 0 ? (
            <p>Not connected to any participant or VG leader.</p>
          ) : (
            <ConnectionsTree
              name={`${leader.lastName}, ${leader.firstName}`}
              above={parentConnections}
              below={childConnections}
            />
          )}
          </div>
          {isDeveloper && hasMovableConnections && moveTargets.length > 0 && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              {moveTargets.map((t) => (
                <MoveConnectionsButton
                  key={t.id}
                  fromId={leader.id}
                  fromName={`${leader.lastName}, ${leader.firstName}`}
                  toId={t.id}
                  toName={`${t.lastName}, ${t.firstName}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Personal Information</h3>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Row label="Nickname" value={leader.nickname} />
          <Row label="Mobile Number" value={leader.mobileNumber} />
          <Row label="Age" value={leader.age != null ? String(leader.age) : null} />
          <Row label="Gender" value={leader.gender} />
          <Row label="Lifestage" value={leader.lifestage} />
          <Row label="Service Serving/Volunteering" value={leader.serviceAttending} />
          <Row label="Facebook / Messenger Name" value={leader.facebookMessengerName} />
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
              Name of their Victory Group Leader
            </dt>
            <dd className="text-sm text-gray-900">
              {leader.ownVgLeaderId ? (
                <Link
                  href={`/vg-leader-portal/leaders/${leader.ownVgLeaderId}`}
                  className="text-indigo-600 hover:text-indigo-800 underline"
                >
                  {leader.ownVgLeaderName || "—"}
                </Link>
              ) : (
                leader.ownVgLeaderName || "—"
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Leadership</h3>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Row
            label="Started Leading a Victory Group"
            value={
              leader.startedLeadingVg === "before_this_year"
                ? "Before this year"
                : leader.startedLeadingVg === "this_year"
                  ? "This year"
                  : null
            }
          />
          <Row label="Leadership Group Leader?" value={leader.isLeadershipGroupLeader ? "Yes" : "No"} />
          {leader.isLeadershipGroupLeader && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">VG Leaders they lead</dt>
              <dd className="text-sm text-gray-900">
                {lglMembers.length === 0 ? (
                  "—"
                ) : (
                  <ul className="flex flex-col gap-1">
                    {lglMembers.map((m) => (
                      <li key={m.id}>
                        <Link href={`/vg-leader-portal/leaders/${m.id}`} className="text-indigo-600 hover:text-indigo-800 underline">
                          {m.lastName}, {m.firstName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Discipleship Journey</h3>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            {DISCIPLESHIP_JOURNEY_STEPS.map((s) => {
              const done = completedSteps.includes(s);
              return (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className={done ? "text-green-600" : "text-gray-300"}>{done ? "✓" : "○"}</span>
                  <span className={done ? "text-gray-900" : "text-gray-400"}>{s}</span>
                </div>
              );
            })}
          </div>
          <Row
            label="Graduate of Leadership 113?"
            value={leadership113Label(leader.graduateOfLeadership113)}
          />
        </div>
      </div>

      <GroupListSection
        title="Victory Groups"
        emptyLabel="No victory groups yet."
        rowLabel="Victory Group"
        groups={groups.filter((g) => g.type !== "leadership_group")}
        internsByGroup={internsByGroup}
      />

      {leader.isLeadershipGroupLeader && (
        <GroupListSection
          title="Leadership Groups"
          emptyLabel="No leadership groups yet."
          rowLabel="Leadership Group"
          groups={groups.filter((g) => g.type === "leadership_group")}
          internsByGroup={internsByGroup}
        />
      )}
    </div>
  );
}

function GroupListSection({
  title,
  emptyLabel,
  rowLabel,
  groups,
  internsByGroup,
}: {
  title: string;
  emptyLabel: string;
  rowLabel: string;
  groups: VictoryGroup[];
  internsByGroup: Record<number, { lastName: string; firstName: string }[]>;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
        <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">{emptyLabel}</p>
        ) : (
          groups.map((g, index) => {
            const groupInterns = internsByGroup[g.id] ?? [];
            const internNames = groupInterns.map((i) => `${i.lastName}, ${i.firstName}`).join("; ");
            return (
              <div key={g.id} className="px-4 py-3 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{g.name || `${rowLabel} ${index + 1}`}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {g.place} · {DAY_ABBR[g.day]} · {g.time} ·{" "}
                  {g.frequency === "Others" ? (g.otherFrequency ?? "Others") : g.frequency}
                  {g.lifeStage?.length ? ` · ${g.lifeStage.join(", ")}` : ""}
                  {internNames ? ` · Interns: ${internNames}` : ""}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
