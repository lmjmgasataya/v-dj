"use client";

import { useEffect, useMemo, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from "react-force-graph-2d";
import { EDGE_STYLE, NODE_STYLE, nodeStyleKey, type GraphLink, type GraphNode } from "./graphTypes";

type N = NodeObject<GraphNode>;
type L = LinkObject<GraphNode, GraphLink>;

const DIM_ALPHA = 0.2;
const DIM_LINK = "rgba(209, 213, 219, 0.5)"; // gray-300, faded

// Each person is a card of this size (graph units — it scales with the zoom like everything else).
const CARD_W = 96;
const CARD_H = 52;
const CARD_R = 8;
const CARD_GAP = 36; // minimum space kept between two cards
const LEVEL_GAP = 110; // tree: vertical space between one row of cards and the next
const TOP_BORDER = 5; // the thick role-coloured strip along the top
const ARROW = 6;
const LAST_FONT = "600 11px sans-serif";
const FIRST_FONT = "10px sans-serif";
const SUB_FONT = "9px sans-serif";

export type GraphLayout = "tree" | "network";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Truncate with "…" so the text fits `max` wide (in the context's current font).
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

// Where a ray from the card's centre towards (dx, dy) leaves the card's edge.
function edgePoint(x: number, y: number, dx: number, dy: number) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const t = Math.min(ux ? (CARD_W / 2) / Math.abs(ux) : Infinity, uy ? (CARD_H / 2) / Math.abs(uy) : Infinity);
  return { x: x + ux * t, y: y + uy * t };
}

/**
 * Keeps cards from overlapping. A sweep over nodes sorted by x, so only nearby pairs are checked.
 * In the tree layout each row's y is pinned (fy), so overlaps there are pushed apart sideways.
 */
function cardCollide(strength = 0.8) {
  let nodes: N[] = [];
  const force = () => {
    const sorted = nodes.filter((n) => n.x != null && n.y != null).sort((a, b) => a.x! - b.x!);
    const minDx = CARD_W + CARD_GAP;
    const minDy = CARD_H + CARD_GAP;
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      for (let j = i + 1; j < sorted.length && sorted[j].x! - a.x! < minDx; j++) {
        const b = sorted[j];
        const dx = b.x! - a.x!;
        const dy = b.y! - a.y!;
        const ox = minDx - Math.abs(dx);
        const oy = minDy - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        const pinnedY = a.fy != null || b.fy != null;
        if (pinnedY || ox < oy) {
          const s = ((dx >= 0 ? 1 : -1) * ox * strength) / 2;
          a.vx = (a.vx ?? 0) - s;
          b.vx = (b.vx ?? 0) + s;
        } else {
          const s = ((dy >= 0 ? 1 : -1) * oy * strength) / 2;
          a.vy = (a.vy ?? 0) - s;
          b.vy = (b.vy ?? 0) + s;
        }
      }
    }
  };
  force.initialize = (n: N[]) => {
    nodes = n;
  };
  return force;
}

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
  // Truncated card text per node, so names aren't re-measured every frame.
  const textCache = useRef(new Map<string, { last: string; first: string; sub: string }>());

  // Cards push each other apart; the charge just spreads clusters out. Re-fit after it settles.
  useEffect(() => {
    ref.current?.d3Force("charge")?.strength(layout === "tree" ? -250 : -400);
    ref.current?.d3Force("link")?.distance(layout === "tree" ? 120 : 180);
    ref.current?.d3Force("collide", cardCollide() as never);
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
    ref.current?.zoom(2.5, 600);
  }, [focus, nodes]);

  // Same object across re-renders — a new one (e.g. on every click/selection) makes force-graph
  // treat it as new data and re-run the layout. Only a filter change should do that.
  const graphData = useMemo(() => ({ nodes: nodes as N[], links: links as L[] }), [nodes, links]);

  const isLit = (id: string) => !highlight || highlight.has(id);

  function cardText(ctx: CanvasRenderingContext2D, n: GraphNode) {
    let t = textCache.current.get(n.id);
    if (!t) {
      const max = CARD_W - 10;
      ctx.font = LAST_FONT;
      const last = fit(ctx, n.lastName, max);
      ctx.font = FIRST_FONT;
      const first = fit(ctx, n.firstName, max);
      ctx.font = SUB_FONT;
      const sub = fit(ctx, n.service || NODE_STYLE[nodeStyleKey(n)].label, max);
      t = { last, first, sub };
      textCache.current.set(n.id, t);
    }
    return t;
  }

  return (
    <ForceGraph2D<GraphNode, GraphLink>
      ref={ref}
      width={width}
      height={height}
      graphData={graphData}
      nodeId="id"
      nodeLabel={(n) => (n.service ? `${n.label} · ${n.service}` : n.label)}
      dagMode={layout === "tree" ? "td" : undefined}
      dagLevelDistance={CARD_H + LEVEL_GAP}
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
      nodePointerAreaPaint={(n, color, ctx) => {
        if (n.x == null || n.y == null) return;
        ctx.fillStyle = color;
        ctx.fillRect(n.x - CARD_W / 2, n.y - CARD_H / 2, CARD_W, CARD_H);
      }}
      nodeCanvasObjectMode={() => "replace"}
      nodeCanvasObject={(n, ctx, scale) => {
        if (n.x == null || n.y == null) return;
        const color = NODE_STYLE[nodeStyleKey(n)].color;
        const selected = n.id === selectedId;
        const x0 = n.x - CARD_W / 2;
        const y0 = n.y - CARD_H / 2;
        ctx.save();
        ctx.globalAlpha = isLit(n.id) ? 1 : DIM_ALPHA;

        if (selected) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
        }
        roundRect(ctx, x0, y0, CARD_W, CARD_H, CARD_R);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = selected ? 2.5 : 1.25;
        ctx.strokeStyle = color;
        ctx.stroke();

        // Thick top border in the role colour.
        ctx.save();
        ctx.clip();
        ctx.fillStyle = color;
        ctx.fillRect(x0, y0, CARD_W, TOP_BORDER);
        ctx.restore();

        // Text — skipped when it would be too small to read, or when names are switched off.
        const showText = (showNames || selected || !!highlight?.has(n.id)) && 11 * scale >= 4;
        if (showText) {
          const { last, first, sub } = cardText(ctx, n);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = LAST_FONT;
          ctx.fillStyle = "#111827";
          ctx.fillText(last, n.x, y0 + TOP_BORDER + 11);
          ctx.font = FIRST_FONT;
          ctx.fillStyle = "#374151";
          ctx.fillText(first, n.x, y0 + TOP_BORDER + 24);
          ctx.font = SUB_FONT;
          ctx.fillStyle = "#6b7280";
          ctx.fillText(sub, n.x, y0 + TOP_BORDER + 37);
        }
        ctx.restore();
      }}
      linkCanvasObjectMode={() => "replace"}
      linkCanvasObject={(l, ctx, scale) => {
        const s = l.source as N;
        const t = l.target as N;
        if (s.x == null || s.y == null || t.x == null || t.y == null) return;
        const lit = isLit(s.id) && isLit(t.id);
        const style = EDGE_STYLE[l.kind];
        const color = lit ? style.color : DIM_LINK;

        // A smooth curve from the card above to the card below. Tree: an S-curve from the bottom
        // edge to the top edge. Network (or a tree link that doesn't go down): a gentle arc.
        let start: { x: number; y: number };
        let end: { x: number; y: number };
        let tangent: { x: number; y: number }; // the direction the curve arrives at `end`
        ctx.beginPath();
        if (layout === "tree" && t.y - s.y > CARD_H) {
          start = { x: s.x, y: s.y + CARD_H / 2 };
          end = { x: t.x, y: t.y - CARD_H / 2 - ARROW };
          const midY = (start.y + end.y) / 2;
          ctx.moveTo(start.x, start.y);
          ctx.bezierCurveTo(start.x, midY, end.x, midY, end.x, end.y);
          tangent = { x: 0, y: 1 };
        } else {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const cx = (s.x + t.x) / 2 - dy * 0.2;
          const cy = (s.y + t.y) / 2 + dx * 0.2;
          start = edgePoint(s.x, s.y, cx - s.x, cy - s.y);
          const tip = edgePoint(t.x, t.y, cx - t.x, cy - t.y);
          const len = Math.hypot(tip.x - cx, tip.y - cy) || 1;
          tangent = { x: (tip.x - cx) / len, y: (tip.y - cy) / len };
          end = { x: tip.x - tangent.x * ARROW, y: tip.y - tangent.y * ARROW };
          ctx.moveTo(start.x, start.y);
          ctx.quadraticCurveTo(cx, cy, end.x, end.y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = (highlight && lit ? 2 : 1.1) / scale;
        ctx.setLineDash(style.dashed ? [4 / scale, 3 / scale] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead, its tip touching the target card.
        const tipX = end.x + tangent.x * ARROW;
        const tipY = end.y + tangent.y * ARROW;
        const px = -tangent.y * (ARROW / 2);
        const py = tangent.x * (ARROW / 2);
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(end.x + px, end.y + py);
        ctx.lineTo(end.x - px, end.y - py);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }}
    />
  );
}
