"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  loadDecisions,
  saveDecision,
  STORAGE_KEY,
  type DecisionMap,
} from "@/lib/decisions";
import type { ReviewerDecision } from "@/types/review";

/*
 * Reviewer decisions as an external store over localStorage.
 * useSyncExternalStore gives an empty map on the server and during hydration,
 * then the stored map, without a setState-in-effect. It also picks up
 * changes made in other tabs via the `storage` event.
 */

const EMPTY: DecisionMap = {};
const listeners = new Set<() => void>();
/** Used only when storage can't be written (private mode, quota). */
let sessionOnly: DecisionMap | null = null;
let cached: { raw: string | null; map: DecisionMap } | null = null;

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function readRaw(): string | null {
  try {
    return storage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function getSnapshot(): DecisionMap {
  if (sessionOnly) return sessionOnly;
  const raw = readRaw();
  // Same reference while nothing changed, as useSyncExternalStore requires.
  if (cached && cached.raw === raw) return cached.map;
  cached = { raw, map: loadDecisions(storage()) };
  return cached.map;
}

function getServerSnapshot(): DecisionMap {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDecisions(): {
  decisions: DecisionMap;
  save: (d: ReviewerDecision) => { persisted: boolean };
} {
  const decisions = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const save = useCallback((d: ReviewerDecision) => {
    const { map, persisted } = saveDecision(storage(), getSnapshot(), d);
    sessionOnly = persisted ? null : map;
    listeners.forEach((l) => l());
    return { persisted };
  }, []);
  return { decisions, save };
}
