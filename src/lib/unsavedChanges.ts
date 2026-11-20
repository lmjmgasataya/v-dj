// Client-side "unsaved changes" flag shared by UnsavedChangesGuard and the pickers that navigate
// with router.push (BatchPicker, ParamSelect) — those don't fire beforeunload or link clicks.

let dirtyMessage: string | null = null;

export function setUnsavedChanges(message: string | null) {
  dirtyMessage = message;
}

export function hasUnsavedChanges() {
  return dirtyMessage != null;
}

/** True when it's fine to navigate away: nothing unsaved, or the user confirmed losing it. */
export function confirmLeave(): boolean {
  if (dirtyMessage == null) return true;
  if (!window.confirm(dirtyMessage)) return false;
  dirtyMessage = null;
  return true;
}
