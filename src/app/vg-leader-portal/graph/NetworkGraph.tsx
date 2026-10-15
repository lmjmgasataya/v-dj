"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  EDGE_STYLE,
  NODE_STYLE,
  PROFILE_STYLE,
  nodeStyleKey,
  type GraphEdgeKind,
  type GraphLink,
  type GraphNode,
  type ProfileStatus,
} from "./graphTypes";

import type { GraphLayout } from "./GraphCanvas";

// force-graph touches `window` on import, so it only loads in the browser.
const GraphCanvas = dynamic(() => import("./GraphCanvas"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-gray-400">Loading graph…</p>,
});

const EDGE_KINDS = Object.keys(EDGE_STYLE) as GraphEdgeKind[];
// Participant links start unticked, so the graph opens on the leader network.
const OFF_BY_DEFAULT: GraphEdgeKind[] = ["participantVgl", "participantDiscipler"];
const PROFILE_STATUSES = Object.keys(PROFILE_STYLE) as ProfileStatus[];

// A copy of `set` with `k` switched on or off.
function toggled<T>(set: Set<T>, k: T) {
  const next = new Set(set);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  return next;
}

// Wording for the side panel, from the selected person's point of view.
const OUTGOING: Record<GraphEdgeKind, string> = {
  lgl: "Leads in their Leadership Group",
  vgLeader: "Is the VG Leader of",
  participantVgl: "VG Leader of participants",
  participantDiscipler: "Disciples participants",
  intern: "Interns in their Victory Groups",
};
const INCOMING: Record<GraphEdgeKind, string> = {
  lgl: "Leadership Group Leader",
  vgLeader: "Their VG Leader",
  participantVgl: "Their VG Leader",
  participantDiscipler: "Their Discipler",
  intern: "Their VG Leader",
};

const words = (s: string) => s.toLowerCase().split(/[\s,()·]+/).filter(Boolean);

/**
 * The best match for a search: the exact name first, then every word of the query matching a
 * word of the name — in any order, so "juan dela cruz" finds "Dela Cruz, Juan" — whole, by its
 * start, then anywhere in it.
 */
function findPerson(people: GraphNode[], query: string, nameOf: (n: GraphNode) => string) {
  const q = query.trim().toLowerCase();
  const exact = people.find((n) => nameOf(n).toLowerCase() === q || n.label.toLowerCase() === q);
  if (exact) return exact;
  const tokens = words(q);
  if (!tokens.length) return undefined;
  const named = people.map((n) => ({ n, ws: words(n.label) }));
  const tests = [(w: string, t: string) => w === t, (w: string, t: string) => w.startsWith(t), (w: string, t: string) => w.includes(t)];
  for (const test of tests) {
    const hit = named.find(({ ws }) => tokens.every((t) => ws.some((w) => test(w, t))));
    if (hit) return hit.n;
  }
  return undefined;
}

export function NetworkGraph({ nodes: allNodes, links: allLinks }: { nodes: GraphNode[]; links: GraphLink[] }) {
  const [edgeKinds, setEdgeKinds] = useState<Set<GraphEdgeKind>>(
    () => new Set(EDGE_KINDS.filter((k) => !OFF_BY_DEFAULT.includes(k))),
  );
  const [hideUnconnected, setHideUnconnected] = useState(true);
  const [hideDisciplerOnly, setHideDisciplerOnly] = useState(true);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchMiss, setSearchMiss] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; seq: number } | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [layout, setLayout] = useState<GraphLayout>("tree");
  const [showNames, setShowNames] = useState(true);
  const [showDownline, setShowDownline] = useState(false);
  const [profileMarks, setProfileMarks] = useState<Set<ProfileStatus>>(() => new Set(PROFILE_STATUSES));

  const box = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [fullScreen, setFullScreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullScreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  function toggleFullScreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen();
  }
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // force-graph keeps positions on the node objects, so reuse the same objects across filter
  // changes (the layout doesn't jump) but hand it fresh link objects (it rewrites their ends).
  // `shownLinks` are the same links untouched (plain id ends), for the side panel.
  const disciplerOnlyIds = useMemo(() => new Set(allNodes.filter((n) => n.isDisciplerOnly).map((n) => n.id)), [allNodes]);
  const { nodes, links, shownLinks } = useMemo(() => {
    const hidden = (id: string) => hideDisciplerOnly && disciplerOnlyIds.has(id);
    const shownLinks = allLinks.filter((l) => edgeKinds.has(l.kind) && !hidden(l.source) && !hidden(l.target));
    const linked = new Set(shownLinks.flatMap((l) => [l.source, l.target]));
    const nodes = allNodes.filter((n) => !hidden(n.id) && ((n.kind === "leader" && !hideUnconnected) || linked.has(n.id)));
    return { nodes, links: shownLinks.map((l) => ({ ...l })), shownLinks };
  }, [allNodes, allLinks, edgeKinds, hideUnconnected, hideDisciplerOnly, disciplerOnlyIds]);

  // Someone the filters hide counts as not selected — and is selected again if they come back.
  const shownIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);
  const selectedId = pickedId && shownIds.has(pickedId) ? pickedId : null;

  const byId = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  // People who share a name get their role and service added, so the suggestions tell them apart.
  const searchNames = useMemo(() => {
    const count = new Map<string, number>();
    for (const n of nodes) count.set(n.label, (count.get(n.label) ?? 0) + 1);
    return new Map(
      nodes.map((n) => {
        if (count.get(n.label) === 1) return [n.id, n.label];
        const extra = [NODE_STYLE[nodeStyleKey(n)].label, n.service].filter(Boolean).join(" · ");
        return [n.id, `${n.label} (${extra})`];
      }),
    );
  }, [nodes]);
  const searchName = (n: GraphNode) => searchNames.get(n.id) ?? n.label;

  // The selected person's connections as the graph shows them (same filters), grouped by kind and direction.
  const neighbourGroups = useMemo(() => {
    if (!selectedId) return [];
    const groups = new Map<string, GraphNode[]>();
    for (const l of shownLinks) {
      const out = l.source === selectedId;
      if (!out && l.target !== selectedId) continue;
      const label = out ? OUTGOING[l.kind] : INCOMING[l.kind];
      const other = byId.get(out ? l.target : l.source);
      if (other) groups.set(label, [...(groups.get(label) ?? []), other]);
    }
    return [...groups.entries()].map(([label, people]) => ({
      label,
      people: people.sort((a, b) => a.label.localeCompare(b.label)),
    }));
  }, [selectedId, shownLinks, byId]);

  // With "Highlight downline" on: the selected person and everyone below them, following the
  // shown links down any number of levels.
  const downline = useMemo(() => {
    if (!showDownline || !selectedId) return null;
    const below = new Map<string, string[]>();
    for (const l of shownLinks) {
      const ids = below.get(l.source);
      if (ids) ids.push(l.target);
      else below.set(l.source, [l.target]);
    }
    const seen = new Set([selectedId]);
    const queue = [selectedId];
    for (const id of queue) {
      for (const next of below.get(id) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    return seen;
  }, [showDownline, selectedId, shownLinks]);

  const highlight = useMemo(
    () =>
      selectedId
        ? new Set([selectedId, ...neighbourGroups.flatMap((g) => g.people.map((p) => p.id)), ...(downline ?? [])])
        : null,
    [selectedId, neighbourGroups, downline],
  );

  function select(id: string | null, pan = false) {
    setPickedId(id);
    if (id && pan) setFocus((f) => ({ id, seq: (f?.seq ?? 0) + 1 }));
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const hit = findPerson(nodes, query, searchName);
    if (hit) {
      setSearchMiss(null);
      select(hit.id, true);
      return;
    }
    // Say why nothing happened: no such person, or they're filtered out of the graph.
    const hidden = findPerson(allNodes, query, searchName);
    setSearchMiss(hidden ? `${hidden.label} is hidden by the current filters` : "No one by that name");
  }

  const counts = useMemo(() => {
    const c = { leader: 0, participant: 0, intern: 0, unclaimed: 0, incomplete: 0 };
    for (const n of nodes) {
      c[n.kind] += 1;
      if (n.profileStatus) c[n.profileStatus] += 1;
    }
    return c;
  }, [nodes]);

  return (
    <div ref={root} className={`flex flex-col gap-3 ${fullScreen ? "h-screen overflow-auto bg-gray-50 p-3" : ""}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs">
        <form onSubmit={search} className="flex items-center gap-2">
          <input
            list="graph-people"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchMiss(null);
            }}
            placeholder="Find a person…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <datalist id="graph-people">
            {nodes.map((n) => (
              <option key={n.id} value={searchName(n)} />
            ))}
          </datalist>
          <button type="submit" className="rounded-lg bg-[#00428E] px-3 py-1.5 font-semibold text-white hover:bg-[#003578]">
            Find
          </button>
          {searchMiss && <span className="text-amber-700">{searchMiss}</span>}
        </form>
        <button
          type="button"
          onClick={() => setFitKey((k) => k + 1)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          Zoom to fit
        </button>
        <button
          type="button"
          onClick={toggleFullScreen}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          {fullScreen ? "Exit full screen" : "Full screen"}
        </button>
        <div className="flex overflow-hidden rounded-lg border border-gray-300">
          {(
            [
              { key: "tree", label: "Tree" },
              { key: "network", label: "Network" },
            ] as const
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setLayout(o.key)}
              className={`px-3 py-1.5 font-medium ${layout === o.key ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-gray-600">
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
          Show names
        </label>
        <label
          className="flex items-center gap-1.5 text-gray-600"
          title="When someone is selected, also highlight everyone below them — any number of levels down"
        >
          <input type="checkbox" checked={showDownline} onChange={(e) => setShowDownline(e.target.checked)} />
          Highlight downline
          <span className="text-[9px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.5">
            New
          </span>
        </label>
        <label className="flex items-center gap-1.5 text-gray-600">
          <input type="checkbox" checked={hideUnconnected} onChange={(e) => setHideUnconnected(e.target.checked)} />
          Hide leaders with no connections
        </label>
        <label
          className="flex items-center gap-1.5 text-gray-600"
          title="People that participants name only as their discipler — not anyone's VG leader, no Victory Group, not an LGL"
        >
          <input type="checkbox" checked={hideDisciplerOnly} onChange={(e) => setHideDisciplerOnly(e.target.checked)} />
          Hide disciplers who aren&apos;t VG leaders ({disciplerOnlyIds.size})
        </label>
        <span className="ml-auto text-gray-400">
          {counts.leader} leaders · {counts.participant} participants · {counts.intern} interns · {links.length} links
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        {/* Graph */}
        {/* Fills the window below the header/toolbar (the whole screen in full-screen mode). */}
        <div
          ref={box}
          className={`relative min-h-[420px] flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white ${
            fullScreen ? "h-[calc(100vh-5.5rem)]" : "h-[calc(100vh-15rem)]"
          }`}
        >
          {size.width > 0 && (
            <GraphCanvas
              nodes={nodes}
              links={links}
              width={size.width}
              height={size.height}
              selectedId={selectedId}
              highlight={highlight}
              downline={downline}
              focus={focus}
              fitKey={fitKey}
              layout={layout}
              showNames={showNames}
              profileMarks={profileMarks}
              onSelect={(id) => select(id)}
            />
          )}
        </div>

        {/* Legend + selection */}
        <aside
          className={`flex w-full lg:w-72 shrink-0 flex-col gap-3 text-xs ${
            fullScreen ? "lg:h-[calc(100vh-5.5rem)]" : "lg:h-[calc(100vh-15rem)]"
          }`}
        >
          <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-semibold text-gray-700 uppercase tracking-wide">People</p>
            <ul className="flex flex-col gap-1.5">
              {(Object.keys(NODE_STYLE) as (keyof typeof NODE_STYLE)[]).map((k) => (
                <li key={k} className="flex items-center gap-2 text-gray-600">
                  {/* Mirrors a card in the graph: role-coloured border, thicker on top. */}
                  <span
                    className="h-3.5 w-6 rounded-[4px] border border-t-4 bg-white"
                    style={{ borderColor: NODE_STYLE[k].color }}
                  />
                  {NODE_STYLE[k].label}
                </li>
              ))}
            </ul>
            <p className="mt-4 mb-2 font-semibold text-gray-700 uppercase tracking-wide">Leader profiles</p>
            <ul className="flex flex-col gap-1.5">
              {PROFILE_STATUSES.map((s) => (
                <li key={s}>
                  <label className="flex items-center gap-2 text-gray-600">
                    <input type="checkbox" checked={profileMarks.has(s)} onChange={() => setProfileMarks((prev) => toggled(prev, s))} />
                    {/* Mirrors a marked card: tinted fill, dot on the corner. */}
                    <span
                      className="relative h-3.5 w-6 shrink-0 rounded-[4px] border"
                      style={{ background: PROFILE_STYLE[s].fill, borderColor: PROFILE_STYLE[s].dot }}
                    >
                      <span
                        className="absolute -right-1 -top-1 h-2 w-2 rounded-full ring-1 ring-white"
                        style={{ background: PROFILE_STYLE[s].dot }}
                      />
                    </span>
                    <span>
                      {PROFILE_STYLE[s].label} <span className="text-gray-400">({counts[s]})</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-4 mb-2 font-semibold text-gray-700 uppercase tracking-wide">Connections</p>
            <ul className="flex flex-col gap-1.5">
              {EDGE_KINDS.map((k) => (
                <li key={k}>
                  <label className="flex items-center gap-2 text-gray-600">
                    <input type="checkbox" checked={edgeKinds.has(k)} onChange={() => setEdgeKinds((prev) => toggled(prev, k))} />
                    <span
                      className={`w-5 border-t-2 ${EDGE_STYLE[k].dashed ? "border-dashed" : ""}`}
                      style={{ borderColor: EDGE_STYLE[k].color }}
                    />
                    {EDGE_STYLE[k].label}
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-gray-400">
              Arrows point from the person above to the person below. In Tree layout, each row is one level down.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {!selected ? (
              <p className="text-gray-400">Click a person in the graph (or find them above) to see their connections.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: NODE_STYLE[nodeStyleKey(selected)].color }} />
                    {selected.label}
                  </p>
                  <p className="mt-0.5 text-gray-500">
                    {NODE_STYLE[nodeStyleKey(selected)].label}
                    {selected.service ? ` · ${selected.service}` : ""}
                  </p>
                  {selected.profileStatus && (
                    <p className="mt-1">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 font-medium"
                        style={{ background: PROFILE_STYLE[selected.profileStatus].fill, color: PROFILE_STYLE[selected.profileStatus].text }}
                      >
                        {PROFILE_STYLE[selected.profileStatus].label}
                      </span>
                    </p>
                  )}
                  {selected.href && (
                    <Link href={selected.href} className="mt-1 inline-block text-indigo-600 hover:text-indigo-800 hover:underline">
                      Open profile →
                    </Link>
                  )}
                </div>
                {neighbourGroups.length === 0 ? (
                  <p className="text-gray-400">No connections shown with the current filters.</p>
                ) : (
                  neighbourGroups.map((g) => (
                    <div key={g.label}>
                      <p className="mb-1 font-medium text-gray-700">
                        {g.label} <span className="font-normal text-gray-400">({g.people.length})</span>
                      </p>
                      <ul className="flex flex-col gap-0.5">
                        {g.people.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => select(p.id, true)}
                              className="flex items-center gap-1.5 text-left text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: NODE_STYLE[nodeStyleKey(p)].color }} />
                              {p.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
