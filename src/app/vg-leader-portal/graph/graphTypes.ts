export type GraphNodeKind = "leader" | "participant" | "intern";

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  /** "Last, First" — used for search and the side panel. */
  label: string;
  /** Shown on separate lines on the graph card. */
  lastName: string;
  firstName: string;
  href?: string;
  /** Leaders only. */
  isLgl?: boolean;
  /** Service they attend (leaders and participants). */
  service?: string | null;
};

/** Edges point from the person above to the person below. */
export type GraphEdgeKind = "vgLeader" | "lgl" | "participantVgl" | "participantDiscipler" | "intern";

export type GraphLink = { source: string; target: string; kind: GraphEdgeKind };

export const NODE_STYLE: Record<GraphNodeKind | "lglLeader", { color: string; label: string }> = {
  lglLeader: { color: "#d97706", label: "Leadership Group Leader" },
  leader: { color: "#4f46e5", label: "VG Leader" },
  participant: { color: "#059669", label: "Participant" },
  intern: { color: "#db2777", label: "Intern" },
};

export const EDGE_STYLE: Record<GraphEdgeKind, { color: string; label: string; dashed?: boolean }> = {
  lgl: { color: "#f59e0b", label: "Leads in Leadership Group" },
  vgLeader: { color: "#818cf8", label: "Is their VG Leader" },
  participantVgl: { color: "#34d399", label: "Participant's VG Leader" },
  participantDiscipler: { color: "#2dd4bf", label: "Participant's Discipler", dashed: true },
  intern: { color: "#f472b6", label: "Intern in their Victory Group" },
};

export const nodeStyleKey = (n: GraphNode) => (n.kind === "leader" && n.isLgl ? "lglLeader" : n.kind);
