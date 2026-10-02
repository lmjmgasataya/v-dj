"use client";

import { useEffect, useState } from "react";

export interface NavItem {
  id: string;
  label: string;
  count?: number;
  children?: NavItem[];
}

// A section counts as "being viewed" once its top has scrolled past this many px from the top of the viewport.
const ACTIVE_OFFSET = 120;

function flatten(items: NavItem[]): NavItem[] {
  return items.flatMap((i) => [i, ...flatten(i.children ?? [])]);
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

function CountBadge({ count, active }: { count?: number; active: boolean }) {
  if (count == null) return null;
  return (
    <span
      className={`ml-auto shrink-0 rounded-full px-1.5 text-[10px] font-semibold leading-4 ${
        active ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {count}
    </span>
  );
}

function NavList({ items, activeId }: { items: NavItem[]; activeId: string | null }) {
  const isActiveGroup = (item: NavItem) => item.id === activeId || !!item.children?.some((c) => c.id === activeId);
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection(id);
  };

  return (
    <nav aria-label="Report sections" className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1">On this page</p>
      {/* data-nav-list: the scroll container the active link is kept visible in. */}
      <div data-nav-list className="max-h-[calc(100vh-10rem)] overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                data-nav-id={item.id}
                onClick={go(item.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  item.id === activeId
                    ? "bg-indigo-50 text-indigo-700"
                    : isActiveGroup(item)
                      ? "text-indigo-700 hover:bg-gray-100"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span>{item.label}</span>
                <CountBadge count={item.count} active={item.id === activeId} />
              </a>
              {item.children && item.children.length > 0 && (
                <ul className="ml-3 mb-1 flex flex-col gap-0.5 border-l border-gray-200">
                  {item.children.map((c) => (
                    <li key={c.id}>
                      <a
                        href={`#${c.id}`}
                        data-nav-id={c.id}
                        onClick={go(c.id)}
                        className={`-ml-px flex items-start gap-2 rounded-r-lg border-l-2 py-1.5 pl-3 pr-2 text-xs leading-snug transition ${
                          c.id === activeId
                            ? "border-indigo-600 bg-indigo-50 font-medium text-indigo-700"
                            : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <span>{c.label}</span>
                        <CountBadge count={c.count} active={c.id === activeId} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/**
 * Same placement as the /report layout: a card fixed in the left gutter on 2xl screens
 * (where the centered content leaves room), a sticky card beside the content below that,
 * and a sticky jump-to dropdown on phones where a side column would squeeze the tables.
 * Must be rendered as the first child of a `flex flex-col lg:flex-row 2xl:block` wrapper.
 */
export function ReportSideNav({ items }: { items: NavItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  // Scroll-spy: the active section is the last one whose top is above the offset line.
  useEffect(() => {
    const ids = flatten(items).map((i) => i.id);
    let frame = 0;
    function update() {
      frame = 0;
      let current: string | null = ids[0] ?? null;
      let currentTop = -Infinity;
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        // Nested items sit inside their group's card, so compare positions rather than relying on list order.
        if (top != null && top <= ACTIVE_OFFSET && top >= currentTop) {
          current = id;
          currentTop = top;
        }
      }
      // At the very bottom, the last short sections can never reach the offset line — select the last one.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = ids[ids.length - 1] ?? current;
      }
      setActiveId(current);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  // The report streams in behind loading.tsx, so the browser's own jump to a #section in the
  // URL fires before that section exists — redo it once the content is here.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  // Keep the active link visible when the menu itself is taller than the screen.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-nav-list]").forEach((list) => {
      const link = list.querySelector<HTMLElement>(`[data-nav-id="${activeId}"]`);
      if (!link || list.clientHeight === 0) return;
      const linkTop = link.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
      if (linkTop < list.scrollTop || linkTop + link.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTop = linkTop - list.clientHeight / 2;
      }
    });
  }, [activeId]);

  return (
    <>
      {/* Phones: sticky jump-to dropdown. */}
      <div className="lg:hidden sticky top-0 z-20 -mx-4 mb-6 px-4 py-2 bg-gray-50/95 backdrop-blur border-b border-gray-200">
        <select
          aria-label="Jump to section"
          value={activeId ?? ""}
          onChange={(e) => scrollToSection(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
        >
          {items.map((item) =>
            item.children?.length ? (
              <optgroup key={item.id} label={item.label}>
                <option value={item.id}>{item.label} (top)</option>
                {item.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                    {c.count != null ? ` (${c.count})` : ""}
                  </option>
                ))}
              </optgroup>
            ) : (
              <option key={item.id} value={item.id}>
                {item.label}
                {item.count != null ? ` (${item.count})` : ""}
              </option>
            ),
          )}
        </select>
      </div>

      {/* 2xl: fixed in the left gutter, clear of the centered max-w-4xl content (~320px gutter at 1536px). */}
      <div className="hidden 2xl:block fixed left-4 top-24 w-64 z-10">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <NavList items={items} activeId={activeId} />
        </div>
      </div>

      {/* lg–2xl: sticky card beside the content. */}
      <aside className="hidden lg:block 2xl:hidden w-52 shrink-0 sticky top-8 self-start">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <NavList items={items} activeId={activeId} />
        </div>
      </aside>
    </>
  );
}
