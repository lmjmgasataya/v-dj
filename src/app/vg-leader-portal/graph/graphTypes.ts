export type GraphNodeKind = "leader" | "participant" | "intern";

/** Leaders only: no portal account yet, or claimed but the profile isn't completed. */
export type ProfileStatus = "unclaimed" | "incomplete";

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
  /** Leaders only: participants name them only as a discipler — they aren't a VG leader to anyone. */
  isDisciplerOnly?: boolean;
  /** Leaders only: what's left to do on their profile. Unset = claimed and completed. */
  profileStatus?: ProfileStatus;
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

// A leader whose profile needs following up gets a tinted card and a dot on its corner.
// Same hues as the "Profile Not Yet Completed" report's remark tags.
export const PROFILE_STYLE: Record<ProfileStatus, { fill: string; dot: string; text: string; label: string }> = {
  unclaimed: { fill: "#ffe4e6", dot: "#f43f5e", text: "#be123c", label: "Profile not yet claimed" },
  incomplete: { fill: "#fef3c7", dot: "#f59e0b", text: "#b45309", label: "Claimed profile but incomplete" },
};

export const nodeStyleKey =(n: GraphNode) => (n.kind === "leader" && n.isLgl ? "lglLeader" : n.kind);
