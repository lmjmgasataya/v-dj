"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { EDGE_STYLE, NODE_STYLE, nodeStyleKey, type GraphEdgeKind, type GraphLink, type GraphNode } from "./graphTypes";

import type { GraphLayout } from "./GraphCanvas";

// force-graph touches `window` on import, so it only loads in the browser.
const GraphCanvas = dynamic(() => import("./GraphCanvas"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-gray-400">Loading graph…</p>,
});

const EDGE_KINDS = Object.keys(EDGE_STYLE) as GraphEdgeKind[];

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

export function NetworkGraph({ nodes: allNodes, links: allLinks }: { nodes: GraphNode[]; links: GraphLink[] }) {
  const [edgeKinds, setEdgeKinds] = useState<Set<GraphEdgeKind>>(() => new Set(EDGE_KINDS));
  const [hideUnconnected, setHideUnconnected] = useState(true);
  const [hideDisciplerOnly, setHideDisciplerOnly] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<{ id: string; seq: number } | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [layout, setLayout] = useState<GraphLayout>("tree");
  const [showNames, setShowNames] = useState(true);

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
  const disciplerOnlyIds = useMemo(() => new Set(allNodes.filter((n) => n.isDisciplerOnly).map((n) => n.id)), [allNodes]);
  const { nodes, links } = useMemo(() => {
    const hidden = (id: string) => hideDisciplerOnly && disciplerOnlyIds.has(id);
    const links = allLinks
      .filter((l) => edgeKinds.has(l.kind) && !hidden(l.source) && !hidden(l.target))
      .map((l) => ({ ...l }));
    const linked = new Set(links.flatMap((l) => [l.source, l.target]));
    const nodes = allNodes.filter((n) => !hidden(n.id) && ((n.kind === "leader" && !hideUnconnected) || linked.has(n.id)));
    return { nodes, links };
  }, [allNodes, allLinks, edgeKinds, hideUnconnected, hideDisciplerOnly, disciplerOnlyIds]);

  const byId = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  // The selected person's connections, grouped by kind and direction.
  const neighbourGroups = useMemo(() => {
    if (!selectedId) return [];
    const groups = new Map<string, GraphNode[]>();
    for (const l of allLinks) {
      if (!edgeKinds.has(l.kind)) continue;
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
  }, [selectedId, allLinks, edgeKinds, byId]);

  const highlight = useMemo(
    () => (selectedId ? new Set([selectedId, ...neighbourGroups.flatMap((g) => g.people.map((p) => p.id))]) : null),
    [selectedId, neighbourGroups],
  );

  function select(id: string | null, pan = false) {
    setSelectedId(id);
    if (id && pan) setFocus((f) => ({ id, seq: (f?.seq ?? 0) + 1 }));
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit =
      nodes.find((n) => n.label.toLowerCase() === q) ??
      nodes.find((n) => n.label.toLowerCase().includes(q)) ??
      nodes.find((n) => n.label.toLowerCase().split(/[\s,]+/).join(" ").includes(q.replace(/,/g, " ").replace(/\s+/g, " ")));
    if (hit) select(hit.id, true);
  }

  function toggleEdge(k: GraphEdgeKind) {
    setEdgeKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  const counts = useMemo(() => {
    const c = { leader: 0, participant: 0, intern: 0 };
    for (const n of nodes) c[n.kind] += 1;
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a person…"
            className="w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <datalist id="graph-people">
            {nodes.map((n) => (
              <option key={n.id} value={n.label} />
            ))}
          </datalist>
          <button type="submit" className="rounded-lg bg-[#00428E] px-3 py-1.5 font-semibold text-white hover:bg-[#003578]">
            Find
          </button>
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
              focus={focus}
              fitKey={fitKey}
              layout={layout}
              showNames={showNames}
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
            <p className="mt-4 mb-2 font-semibold text-gray-700 uppercase tracking-wide">Connections</p>
            <ul className="flex flex-col gap-1.5">
              {EDGE_KINDS.map((k) => (
                <li key={k}>
                  <label className="flex items-center gap-2 text-gray-600">
                    <input type="checkbox" checked={edgeKinds.has(k)} onChange={() => toggleEdge(k)} />
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
