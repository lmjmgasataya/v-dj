"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getDrillLists } from "./actions";
import type { DrillLists } from "./drillData";

type Load = () => Promise<Record<string, DrillLists>>;

const DrillSourceContext = createContext<Load | null>(null);

/**
 * Which comparison the numbers inside belong to. The first popup opened fetches every name
 * list of that comparison in one request; later popups reuse it.
 */
export function DrillSource({ a, b, children }: { a: number | "live"; b: number | null; children: React.ReactNode }) {
  // Render with key={`${a}-${b}`} so a different comparison starts with a fresh cache and
  // every cell drops lists it loaded for the previous one.
  const [load] = useState<Load>(() => {
    let cache: Promise<Record<string, DrillLists>> | null = null;
    return () => {
      cache ??= getDrillLists(a, b).catch((e) => {
        cache = null; // let the next click retry
        throw e;
      });
      return cache;
    };
  });

  return <DrillSourceContext.Provider value={load}>{children}</DrillSourceContext.Provider>;
}

/** The lists for one cell, loaded when `active` first becomes true. */
export function useDrillLists(cellKey: string, active: boolean) {
  const load = useContext(DrillSourceContext);
  const [lists, setLists] = useState<DrillLists | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!active || lists || !load) return;
    let cancelled = false;
    load()
      .then((all) => {
        if (cancelled) return;
        setError(false);
        setLists(all[cellKey] ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [active, lists, load, cellKey]);

  return { lists, error };
}

export function DrillLoading({ error }: { error: boolean }) {
  return (
    <p className={`px-5 py-6 text-sm text-center ${error ? "text-red-600" : "text-gray-400"}`}>
      {error ? "Couldn't load the names. Close and try again." : "Loading names…"}
    </p>
  );
}
