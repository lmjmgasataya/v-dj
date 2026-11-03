"use client";

import { createContext, useContext } from "react";

// The redesigned check-in UI ships behind the `new_ui_checkin` flag. Components
// shared by both UIs read this to pick their markup; behavior is the same either way.
const NewCheckinUiContext = createContext(false);

export function NewCheckinUiProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <NewCheckinUiContext.Provider value={enabled}>{children}</NewCheckinUiContext.Provider>;
}

export function useNewCheckinUi(): boolean {
  return useContext(NewCheckinUiContext);
}
