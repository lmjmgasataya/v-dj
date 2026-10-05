"use client";

import { useEffect, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from "react-force-graph-2d";
import { EDGE_STYLE, NODE_STYLE, nodeStyleKey, type GraphLink, type GraphNode } from "./graphTypes";

type N = NodeObject<GraphNode>;
type L = LinkObject<GraphNode, GraphLink>;

const DIM = "rgba(209, 213, 219, 0.35)"; // gray-300, faded
const NODE_REL_SIZE = 5;
const nodeVal = (n: GraphNode) => (n.kind === "leader" ? (n.isLgl ? 6 : 3) : 1.5);
// force-graph draws a node as a circle of radius sqrt(val) * nodeRelSize.
const nodeRadius = (n: GraphNode) => Math.sqrt(nodeVal(n)) * NODE_REL_SIZE;

export type GraphLayout = "tree" | "network";

// Ids at either end of a link — force-graph swaps the ids for node objects once it has run.
const endId = (end: L["source"]) => (typeof end === "object" ? (end as N).id : end) as string;

/**
 * The canvas itself (browser-only — loaded with next/dynamic ssr:false from NetworkGraph).
 * `focus` / `fitKey` are requests from the toolbar: change them to pan to a node or zoom to fit.
 */
export default function GraphCanvas({
  nodes,
  links,
  width,
  height,
  selectedId,
  highlight,
  focus,
  fitKey,
  layout,
  showNames,
  onSelect,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  selectedId: string | null;
  /** The selected node and its neighbours; everything else is dimmed. Null = nothing selected. */
  highlight: Set<string> | null;
  focus: { id: string; seq: number } | null;
  fitKey: number;
  /** "tree": top-down levels (people above → people below); "network": free force layout. */
  layout: GraphLayout;
  showNames: boolean;
  onSelect: (id: string | null) => void;
}) {
  const ref = useRef<ForceGraphMethods<N, L>>(undefined);
  // Fit the whole network once, when the first layout settles — not after every drag/filter.
  const fittedOnce = useRef(false);

  // Spread people out more than the defaults so clusters (and their names) don't overlap;
  // the tree needs more sideways push since each level is one row. Re-fit after it settles.
  useEffect(() => {
    ref.current?.d3Force("charge")?.strength(layout === "tree" ? -160 : -80);
    ref.current?.d3Force("link")?.distance(layout === "tree" ? 60 : 45);
    fittedOnce.current = false;
    ref.current?.d3ReheatSimulation();
  }, [layout]);

  useEffect(() => {
    if (fitKey > 0) ref.current?.zoomToFit(600, 40);
  }, [fitKey]);

  useEffect(() => {
    if (!focus) return;
    const n = nodes.find((x) => x.id === focus.id) as N | undefined;
    if (n?.x == null || n.y == null) return;
    ref.current?.centerAt(n.x, n.y, 600);
    ref.current?.zoom(4, 600);
  }, [focus, nodes]);

  const isLit = (id: string) => !highlight || highlight.has(id);

  return (
    <ForceGraph2D<GraphNode, GraphLink>
      ref={ref}
      width={width}
      height={height}
      graphData={{ nodes: nodes as N[], links: links as L[] }}
      nodeId="id"
      nodeLabel={(n) => n.label}
      nodeRelSize={NODE_REL_SIZE}
      nodeVal={nodeVal}
      nodeColor={(n) => (isLit(n.id) ? NODE_STYLE[nodeStyleKey(n)].color : DIM)}
      linkColor={(l) => (isLit(endId(l.source)) && isLit(endId(l.target)) ? EDGE_STYLE[l.kind].color : DIM)}
      linkLineDash={(l) => (EDGE_STYLE[l.kind].dashed ? [2, 2] : null)}
      linkWidth={(l) => (highlight && isLit(endId(l.source)) && isLit(endId(l.target)) ? 1.6 : 0.8)}
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={1}
      dagMode={layout === "tree" ? "td" : undefined}
      dagLevelDistance={90}
      // Two people who list each other (a loop) can't both be "above" — just skip the loop.
      onDagError={() => {}}
      cooldownTicks={200}
      onEngineStop={() => {
        if (fittedOnce.current) return;
        fittedOnce.current = true;
        ref.current?.zoomToFit(400, 40);
      }}
      onNodeClick={(n) => onSelect(n.id)}
      onBackgroundClick={() => onSelect(null)}
      nodeCanvasObjectMode={() => "after"}
      nodeCanvasObject={(n, ctx, scale) => {
        // Same on-screen size at every zoom, with a white outline so names stay readable over lines.
        if (n.x == null || n.y == null) return;
        if (!showNames && n.id !== selectedId && !(highlight?.has(n.id))) return;
        const fontSize = 11 / scale;
        ctx.font = `${n.id === selectedId ? "600 " : ""}${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const y = n.y + nodeRadius(n) + 2 / scale;
        ctx.lineWidth = 3 / scale;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.strokeText(n.label, n.x, y);
        ctx.fillStyle = isLit(n.id) ? "#111827" : "#d1d5db";
        ctx.fillText(n.label, n.x, y);
      }}
    />
  );
}
