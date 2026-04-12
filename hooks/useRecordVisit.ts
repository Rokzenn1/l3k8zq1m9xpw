"use client";

import { useEffect } from "react";

/**
 * Clé sessionStorage : une seule incrémentation par onglet (F5 / refresh ne compte pas).
 * Le Web ne permet pas de distinguer un « scan QR » d’une navigation identique — on évite
 * surtout les doubles comptages par rafraîchissement accidentel.
 */
const SCAN_SESSION_KEY = "leo_evq_scan";

export function useRecordVisit(onDone?: (value: number) => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const prev = sessionStorage.getItem(SCAN_SESSION_KEY);
      if (prev === "1") return;
      if (prev === "pending") return;
      sessionStorage.setItem(SCAN_SESSION_KEY, "pending");
    } catch {
      /* stockage indisponible (mode privé strict, etc.) — on tente quand même un POST */
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/visit", { method: "POST" });
        const json = (await res.json()) as { value?: number };
        if (res.ok && typeof json.value === "number") {
          try {
            sessionStorage.setItem(SCAN_SESSION_KEY, "1");
          } catch {
            /* ignore */
          }
          if (!cancelled) onDone?.(json.value);
        } else {
          try {
            sessionStorage.removeItem(SCAN_SESSION_KEY);
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) {
          try {
            sessionStorage.removeItem(SCAN_SESSION_KEY);
          } catch {
            /* ignore */
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onDone]);
}
