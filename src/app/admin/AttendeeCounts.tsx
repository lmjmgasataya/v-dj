"use client";

import { createContext, useContext } from "react";

// Check-in actions return the session's new "checked in" count instead of revalidating /admin —
// a revalidate re-renders the whole page on the server after every check-in. AdminSessionArea
// owns the counts; the components that check people in report the new count through this.
const SetAttendeeCountContext = createContext<(sessionId: number, count: number) => void>(() => {});

export function SetAttendeeCountProvider({
  value,
  children,
}: {
  value: (sessionId: number, count: number) => void;
  children: React.ReactNode;
}) {
  return <SetAttendeeCountContext.Provider value={value}>{children}</SetAttendeeCountContext.Provider>;
}

export function useSetAttendeeCount(): (sessionId: number, count: number) => void {
  return useContext(SetAttendeeCountContext);
}
