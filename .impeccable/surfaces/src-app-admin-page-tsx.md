---
version: 1
slug: "src-app-admin-page-tsx"
primary_target: "src/app/admin/page.tsx"
related_targets: ["src/app/admin"]
---

# Check-in (/admin)

**Mode:** Operate. Volunteers at the door on their own (often low-end Android) phones, a queue waiting, weak venue internet. Desktop is secondary.

**Task:** pick the session, then check people in, mostly by scanning the QR on their printed ID card; name/mobile search is the backup. Also walk-ins (walk-in sessions) and VG leader check-in (VGL-only sessions).

**Must keep:** every behavior and feature flag of the current page (offline queue + sync, timeout fallback, confirm popup, auto check-in 9:00/9:15, table assignment, Victory Day / Orientation restrictions, hardware scanner typing into search, roster prefetch, undo, remarks, attendees list, settings). The redesign ships behind the `new_ui_checkin` flag; the current UI stays the default until it's switched on.

**Benchmarks (craft bar, not to copy):** Planning Center Check-Ins, Luma event check-in.

## Direction contract

THESIS: The category standard, played straight: a clean mobile check-in app where the session, the count and the Scan button are the whole first screen. It refuses the current stack of numbered step cards, the indigo stat box above the fold, and modal-on-modal clutter.

OWN-WORLD: White surfaces on a cool gray-50 ground, Victory blue #00428E as the only brand color (primary actions, selected session). Geist (already loaded) with tabular numerals for counts and times. Status is color with a word, always: On-time green, Late amber, Absent red, Waiting to sync slate. 16px radius on surfaces, 12px on controls, 44px+ touch targets, thin gray dividers inside one list surface (not one card per row). Drawn line icons in one 2px stroke; no emoji.

STORY: The volunteer sees which session they're on and how many are in, taps Scan (or the camera is already open), and gets an unmistakable result: name, table number, On-time/Late, or why it was blocked, or that it's queued offline. Then straight back to scanning.

FIRST VIEWPORT: Phone, 390 wide. Top: "Check-in" title with batch name, connection pill and settings on the right. Then the session button (name, date, Victory Day / VGLs only / Walk-ins tags) that opens a sheet of sessions. Under it one line of counts: checked in for this session · registered in the batch, with "See list". Then the primary action: a full-width 56px Victory-blue "Scan ID card" button (or the live camera with a Stop button), and the search field directly under it. Results list below. Confirm and success appear as bottom sheets on phones, centered dialogs on desktop.

FORM: The category standard (the standing exit), chosen by the user over the rolled direction; not on my ordered list (the roll assigned #5, Court Scoreboard). seed:309f2dfc212751bf

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
