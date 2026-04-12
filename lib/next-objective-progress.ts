import type { ObjectiveRow } from "@/types";

export type NextObjectiveProgress =
  | {
      kind: "segment";
      next: ObjectiveRow;
      prevThreshold: number;
      /** 0–1 */
      progress: number;
      scansInSegment: number;
      scansToNext: number;
    }
  | { kind: "all_done"; maxThreshold: number }
  | { kind: "empty" };

/**
 * Prochain palier = premier objectif dont le seuil est strictement supérieur au compteur.
 * La jauge va du palier précédent (0 au départ) jusqu’à ce seuil.
 */
export function getNextObjectiveProgress(
  counter: number,
  objectives: ObjectiveRow[],
): NextObjectiveProgress {
  if (objectives.length === 0) return { kind: "empty" };

  const sorted = [...objectives].sort((a, b) => a.threshold - b.threshold);
  const next = sorted.find((o) => counter < o.threshold);

  if (!next) {
    return { kind: "all_done", maxThreshold: sorted[sorted.length - 1].threshold };
  }

  const idx = sorted.indexOf(next);
  const prevThreshold = idx > 0 ? sorted[idx - 1].threshold : 0;
  const span = next.threshold - prevThreshold;
  const scansInSegment = counter - prevThreshold;
  const progress =
    span > 0
      ? Math.min(1, Math.max(0, scansInSegment / span))
      : 1;

  return {
    kind: "segment",
    next,
    prevThreshold,
    progress,
    scansInSegment,
    scansToNext: span,
  };
}
