---
name: Discipleship Journey
description: Victory Iloilo's registration and check-in system, in the familiar style of a mobile check-in app.
colors:
  victory-blue: "#00428E"
  victory-blue-deep: "#003578"
  victory-blue-ink: "#00336E"
  ground: "#f9fafb"
  surface: "#ffffff"
  ink: "#111827"
  ink-secondary: "#4b5563"
  ink-muted: "#6b7280"
  control-stroke: "#d1d5db"
  line: "#e5e7eb"
  fill-muted: "#f3f4f6"
  on-time: "#16a34a"
  on-time-ink: "#166534"
  on-time-tint: "#f0fdf4"
  late: "#d97706"
  late-ink: "#92400e"
  late-tint: "#fffbeb"
  absent: "#dc2626"
  absent-ink: "#991b1b"
  absent-tint: "#fef2f2"
  destructive: "#b91c1c"
  sync: "#475569"
  sync-ink: "#1e293b"
  sync-tint: "#f1f5f9"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "tnum"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  title-sheet:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  tag: "6px"
  segment: "8px"
  control: "12px"
  surface: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  touch: "44px"
  touch-lg: "48px"
  touch-xl: "56px"
components:
  button-scan:
    backgroundColor: "{colors.victory-blue}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: "56px"
    width: "100%"
  button-primary:
    backgroundColor: "{colors.victory-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.victory-blue-deep}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "48px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px 0 44px"
    height: "48px"
  list-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "14px 16px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "16px 20px 20px"
  status-pill-on-time:
    backgroundColor: "{colors.on-time-tint}"
    textColor: "{colors.on-time-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  status-pill-late:
    backgroundColor: "{colors.late-tint}"
    textColor: "{colors.late-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  status-pill-absent:
    backgroundColor: "{colors.absent-tint}"
    textColor: "{colors.absent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  tag:
    backgroundColor: "{colors.fill-muted}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "2px 6px"
  segmented:
    backgroundColor: "{colors.fill-muted}"
    rounded: "{rounded.control}"
    padding: "4px"
    height: "48px"
---

# Design System: Discipleship Journey

## Overview

**Creative North Star: "The Door App"**

A clean mobile check-in app, played straight. The system is the familiar category standard (the kind of screen Planning Center Check-Ins or Luma's event check-in would ship) built for a volunteer holding a low-end Android phone at the church door with a queue waiting. White surfaces sit on a cool gray ground, Victory blue is the only brand color, and status is always a colored word, never color alone. Nothing is themed; the polish comes from careful spacing, generous touch targets, tabular numerals and calm, quick motion.

**Scope, plainly.** This system was introduced on the check-in screen (`/admin`), where it renders only while the `new_ui_checkin` feature flag is on, and it is meant to extend app-wide over time (registration, the VGL Portal, reports), each behind its own flag. Today nothing else follows it: the rest of the app, and `/admin` itself with the flag off, still use the older indigo-accented look of bordered cards and numbered step badges. That older look is not this system and should not be copied into new surfaces. The shared app header (`SiteHeader`) sits above every page but is outside this system and is not described here.

Density is moderate: one column, max 672px wide, 16px between blocks, list rows of about 64px. The first screen is the job: which session, how many are in, the Scan button, the search field, results.

**Key Characteristics:**
- White surfaces on a cool gray-50 ground; Victory blue for primary actions, the selected session and focus.
- Status as color plus word: On-time green, Late amber, Absent red, Waiting to sync slate.
- One list surface with thin dividers, not a card per row.
- Bottom sheets on phones, centered dialogs from 640px up.
- Geist throughout, tabular numerals on every count, time and table number.
- Drawn line icons on one 24px grid, 2px stroke; no emoji.

## Colors

A neutral, cool-gray app palette with a single brand blue and four reserved status hues.

### Primary
- **Victory Blue** (victory-blue): the brand commitment and the only accent. Primary buttons (Scan ID card, Check in, OK, Search on VGL), the "Change" session link, selected session row and check mark, the "Today" tag, focus outlines and input focus rings, the text caret, the table number on the result sheet, and the result disc when someone was already checked in.
- **Deep Victory Blue** (victory-blue-deep): hover state of every filled blue button.
- **Victory Blue Ink** (victory-blue-ink): text on the pale blue "syncing" notice (blue at 5% tint, 20% ring).

### Neutral
- **Cool Ground** (ground): the page background behind every surface.
- **White Surface** (surface): list surfaces, sheets, inputs, secondary buttons, the connection pill.
- **Ink** (ink): names, titles, counts, input text.
- **Secondary Ink** (ink-secondary): dates, details, helper lines, ghost-button text, result counts.
- **Muted Ink** (ink-muted): placeholders, leading search icon, row index numbers, close-button icons.
- **Control Stroke** (control-stroke): 1px border of inputs and inset ring of secondary buttons and pills.
- **Line** (line): outer ring of list surfaces, dividers between result rows, sheet header rule.
- **Muted Fill** (fill-muted): dividers inside the session card, segmented-control track, neutral tags, ghost-button hover, skeleton bars.

### Status
- **On-time** (on-time / on-time-ink / on-time-tint): the green dot and result disc; dark green word; pale green pill fill.
- **Late** (late / late-ink / late-tint): amber result disc (dot is a lighter amber-500); dark amber word; pale amber fill. Also the warning notice and the "VGLs only" tag.
- **Absent** (absent / absent-ink / absent-tint): red disc and dot; dark red word; pale red fill. Also the blocked-check-in banner.
- **Destructive** (destructive): the Remove check-in button and the Undo text action.
- **Waiting to sync** (sync / sync-ink / sync-tint): slate pill and notice for check-ins saved on the phone, "Assigned after sync" in place of a table number.

### Named Rules
**The One Blue Rule.** Victory blue is the only brand color. No indigo, no second accent. Green, amber, red and slate belong to status and are never decoration.

**The Word-With-Color Rule.** Every status shows its word ("On-time", "Late", "Absent", "Waiting to sync") next to its color. A colored dot or disc alone never carries meaning.

## Typography

**Display Font:** Geist (with system sans fallback)
**Body Font:** Geist
**Label/Mono Font:** Geist, with tabular numerals (`tnum`) for figures

**Character:** One neutral grotesque at regular and semibold. Hierarchy comes from size and weight, not from a second family or letter-spaced caps.

### Hierarchy
- **Display** (600, 3.75rem, 1.25, tabular): the table number on the check-in result. The one big number on any screen.
- **Headline** (600, 1.5rem, tight tracking): the page title ("Check-in"). The same size, leading-none and tabular, sets the live checked-in count.
- **Title Sheet** (600, 1.25rem, balanced wrap): sheet titles: the person's name on confirm and result, "Remove …'s check-in?".
- **Title** (600, 1.125rem): the selected session name, sheet headers ("Choose a session"), the result status word.
- **Body** (400, 1rem): inputs and phone-size button labels; 16px on phones so mobile browsers don't zoom.
- **Body Small** (400 or 500, 0.875rem): the workhorse: row details, dates, helper text, desktop button labels, section headings at 1rem semibold.
- **Label** (500, 0.75rem): status pills, tags, the "of N registered" line.

### Named Rules
**The Tabular Figures Rule.** Counts, times, table numbers and row indexes use tabular numerals so they don't jitter as they change.

**The No Eyebrow Rule.** Labels sit in sentence case at normal tracking. Uppercase letter-spaced kickers are not part of this system.

## Layout

A single centered column (max 672px) on the gray ground, with 16px between blocks and 4px of inner gutter on section labels so they line up with surface content. Order on the check-in screen: title row (back link, title, batch, connection pill and settings on the right), session card, Scan button, search, results.

Rows are 14px vertical by 16px horizontal inside list surfaces; sheets pad 20px horizontally and clear the phone's home indicator with `env(safe-area-inset-bottom)`. Sheets cap at 90% of the dynamic viewport height and scroll inside.

One breakpoint matters, 640px: sheets become centered dialogs (384px, or 512px for wide ones like the session picker), sheet buttons sit side by side right-aligned instead of stacked full width, and phone-size controls (48px, 1rem) step down to desktop size (40 to 44px, 0.875rem).

**The Thumb Rule.** On phones every tappable control is at least 44px tall; primary actions are 48px; the Scan button is 56px and full width.

## Elevation & Depth

Mostly flat with tonal layering: white on gray, separated by 1px rings, plus a hairline ambient shadow at rest. Real shadow appears only on things that float above the page: popovers, sheets and dialogs, over a 50% near-black backdrop. Shadows are cool slate-tinted (rgb 15 23 42), never pure black.

### Shadow Vocabulary
- **Surface rest** (`box-shadow: 0 1px 2px rgba(15,23,42,0.05)`): the session card, under its gray-200 ring.
- **Scan lift** (`box-shadow: 0 1px 2px rgba(0,66,142,0.3)`): a blue-tinted hairline under the Scan ID card button.
- **Segment selected** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)`): the selected option lifting out of the segmented track.
- **Popover** (`box-shadow: 0 12px 32px rgba(15,23,42,0.16)`): the settings menu.
- **Sheet** (`box-shadow: 0 -8px 32px rgba(15,23,42,0.18)`): bottom sheets on phones, cast upward.
- **Dialog** (`box-shadow: 0 16px 48px rgba(15,23,42,0.22)`): the same sheet as a centered dialog from 640px.

### Named Rules
**The Float-Only Shadow Rule.** Resting content is separated by rings and tone. Shadows larger than a hairline belong only to layers that float over the page.

## Shapes

Soft, consistent rounding in two main steps: 16px on surfaces (list surfaces, session card, sheets, empty states) and 12px on controls (buttons, inputs, notices, banners, segmented track). Smaller parts nest inside: 8px on segmented options, 6px on tags. Status pills, the connection dot, icon buttons and result discs are fully round. Bottom sheets round only their top corners and carry a 40×4px gray grab handle on phones.

Borders are 1px: a gray-300 stroke on inputs, inset rings on secondary buttons and tinted notices, a gray-200 ring around surfaces. The direction contract planned 12px surfaces and 10px controls; the build shipped 16px and 12px, and the build is the system.

## Components

### Buttons
Plain, solid and unmistakable.
- **Shape:** gently rounded (12px).
- **Scan (signature primary):** full-width 56px Victory-blue button, white 1rem semibold label with a scan icon, blue hairline shadow. One per screen.
- **Primary:** Victory blue, white semibold label, 48px on phones (40 to 44px from 640px), 24px side padding; inline spinner and "Checking in…" while pending.
- **Hover / Focus:** hover deepens to Deep Victory Blue; focus shows a 2px Victory-blue outline offset 2px. Disabled drops to 50% opacity.
- **Secondary:** white with an inset gray-300 ring, dark semibold label (Search, See list, Stop), gray-50 hover.
- **Ghost:** no fill, gray-700 semibold label, gray-100 hover (Cancel, Keep check-in).
- **Destructive:** Destructive red fill, white label, darker red hover (Remove check-in). The Undo row action is red text only.
- **Icon button:** 44px round, muted ink icon, gray-100 hover (close, settings, refresh).

### Status pills and tags
- **Status pill:** fully round, label type, pale tint fill, dark status word, inset ring at the status hue (25 to 30%), and a 6px dot. Always paired with the word.
- **Tag:** small 6px-rounded label for session and participant facts. Gray by default; blue tint for "Today"; amber tint with ring for "VGLs only" and incomplete Victory Day.

### Lists / Containers
- **Corner Style:** 16px.
- **Background:** white on the gray ground.
- **Shadow Strategy:** ring only (gray-200); the session card adds the surface-rest hairline.
- **Border:** 1px dividers between rows (gray-200 in results, gray-100 inside the session card and sheets).
- **Internal Padding:** 14px by 16px rows; 24px for empty states.

### Inputs / Fields
- **Style:** white, 1px gray-300 border, 12px radius, 48px tall, 1rem text; the search field has a 20px leading icon at 14px in.
- **Focus:** border turns Victory blue with a 2px Victory-blue ring at 20%.
- **Placeholder:** muted ink, written as an example ("Name or mobile number").

### Segmented control
The status picker: a gray-100 track (12px radius, 4px padding) with three equal 40px options. The selected option turns white with a status-colored word and ring and a hairline shadow; unselected options are gray-600, darkening on hover. Exposed as a radio group.

### Notices
Inline, 12px-rounded tinted blocks with an inset ring and a leading icon: amber for warnings (Victory Day or class restrictions), slate for offline, pale blue for syncing, green for synced, red for a blocked scan with a red underlined action.

### Sheet (signature)
Bottom sheet on phones, centered dialog from 640px. Rises in with `sheet-in` (24px up from 40% opacity, 240ms, exponential ease-out). Escape closes it when closable; focus is deliberately left in place so a hardware QR scanner can keep typing into the search field. Holds the confirm, result, remove, session-picker and attendees flows.

### Check-in result (signature)
Centered in a sheet: a 64px round disc in the status color (Victory blue if already checked in) with a white check that lands with `result-pop` (scale from 0.82, 320ms, 60ms delay, visible on the first frame), the status word in Title type, "You're checked in, {name}!", then the table number in Display inside a gray-50 ringed panel, and a full-width OK button counting down its auto-dismiss in tabular figures. Offline results swap in a slate "Waiting to sync" pill and "Assigned after sync". Both animations are disabled under `prefers-reduced-motion`.

### Icons
One drawn set on a 24px grid: 2px stroke, round caps and joins, `currentColor`, 20px by default (16px inline). Scan, search, chevrons, check, close, alert, cloud upload, lock, users, refresh, settings, spinner.

## Do's and Don'ts

### Do:
- **Do** keep Victory blue the only brand color, on primary actions, the selected session and focus.
- **Do** show every check-in status as its word plus its color: On-time green, Late amber, Absent red, Waiting to sync slate.
- **Do** put list rows in one white 16px-rounded surface with thin dividers.
- **Do** make phone controls at least 44px tall, primary actions 48px, and the Scan button 56px full width.
- **Do** use tabular numerals for counts, times and table numbers.
- **Do** use bottom sheets on phones and centered dialogs from 640px, rising with the 240ms exponential ease-out.
- **Do** use the 2px-stroke line icon set.
- **Do** put new redesigned surfaces behind their own feature flag, next to the old UI.

### Don't:
- **Don't** reuse the older indigo-accented look (numbered step badges, indigo stat boxes, a bordered card per step) in surfaces built on this system.
- **Don't** wrap each list row in its own card.
- **Don't** open a modal on top of a modal; one sheet at a time.
- **Don't** use emoji or glyph characters as icons.
- **Don't** use uppercase letter-spaced eyebrows or kickers above titles.
- **Don't** use green, amber, red or slate for decoration; they mean status.
