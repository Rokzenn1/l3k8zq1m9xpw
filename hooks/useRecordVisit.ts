"use client";

import { useEffect } from "react";

const STORAGE_KEY = "leo_evq_participation";
const LEGACY_SCAN_KEY = "leo_evq_scan";

function readStoredEpoch(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { e?: number };
    return typeof o.e === "number" ? o.e : null;
  } catch {
    return null;
  }
}

function writeStoredEpoch(epoch: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ e: epoch }));
  } catch {
    /* ignore */
  }
}

function migrateLegacyScan() {
  try {
    if (localStorage.getItem(LEGACY_SCAN_KEY) !== "1") return;
    if (readStoredEpoch() !== null) {
      localStorage.removeItem(LEGACY_SCAN_KEY);
      return;
    }
    writeStoredEpoch(0);
    localStorage.removeItem(LEGACY_SCAN_KEY);
  } catch {
    /* ignore */
  }
}

function pendingKey(epoch: number) {
  return `leo_evq_visit_pending_${epoch}`;
}

type VisitOpts = {
  /** Incrémenté à chaque reset compteur (admin) — nouvelle « vague » de participations */
  participationEpoch: number;
  /** Données site (dont epoch) chargées */
  ready: boolean;
};

/**
 * Une participation par appareil et par « vague » (epoch).
 * localStorage persiste après fermeture du navigateur.
 */
export function useRecordVisit(
  onDone?: (value: number) => void,
  opts?: VisitOpts,
) {
  const participationEpoch = opts?.participationEpoch ?? 0;
  const ready = opts?.ready ?? false;

  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;

    migrateLegacyScan();

    try {
      const last = readStoredEpoch();
      if (last === participationEpoch) return;

      if (localStorage.getItem(pendingKey(participationEpoch)) === "1") return;
      localStorage.setItem(pendingKey(participationEpoch), "1");
    } catch {
      /* stockage indisponible — on tente quand même un POST */
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/visit", { method: "POST" });
        const json = (await res.json()) as { value?: number };
        if (res.ok && typeof json.value === "number") {
          try {
            writeStoredEpoch(participationEpoch);
            localStorage.removeItem(pendingKey(participationEpoch));
          } catch {
            /* ignore */
          }
          if (!cancelled) onDone?.(json.value);
        } else {
          try {
            localStorage.removeItem(pendingKey(participationEpoch));
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) {
          try {
            localStorage.removeItem(pendingKey(participationEpoch));
          } catch {
            /* ignore */
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onDone, participationEpoch, ready]);
}
