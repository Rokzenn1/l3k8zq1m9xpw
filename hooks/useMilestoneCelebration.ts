"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addCelebratedThresholds,
  clearCelebratedThresholds,
  getCelebratedThresholds,
  markValidatedObjectiveThresholds,
} from "@/lib/celebration-storage";
import type { ObjectiveRow } from "@/types";

async function burstConfetti() {
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 140,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.62 },
    colors: ["#f97316", "#fbbf24", "#a855f7", "#22c55e", "#ffffff"],
  });
  setTimeout(() => {
    confetti({
      particleCount: 90,
      angle: 60,
      spread: 50,
      origin: { x: 0, y: 0.65 },
      colors: ["#fb923c", "#fcd34d"],
    });
  }, 180);
  setTimeout(() => {
    confetti({
      particleCount: 90,
      angle: 120,
      spread: 50,
      origin: { x: 1, y: 0.65 },
      colors: ["#a78bfa", "#f472b6"],
    });
  }, 360);
}

/**
 * Détecte le passage de seuils quand le compteur augmente (scan, temps réel).
 * Ne célèbre pas au premier rendu ni après une baisse du compteur (reset admin).
 * Ne rejoue pas un palier déjà célébré sur cet appareil, ni un objectif déjà validé.
 */
export function useMilestoneCelebration(
  counterValue: number,
  objectives: ObjectiveRow[],
) {
  const prevCounterRef = useRef<number | null>(null);
  const [celebration, setCelebration] = useState<ObjectiveRow[] | null>(null);

  useEffect(() => {
    markValidatedObjectiveThresholds(objectives);
  }, [objectives]);

  useEffect(() => {
    const p = prevCounterRef.current;
    if (p === null) {
      prevCounterRef.current = counterValue;
      return;
    }
    if (counterValue < p) {
      prevCounterRef.current = counterValue;
      clearCelebratedThresholds();
      return;
    }

    if (objectives.length === 0) {
      prevCounterRef.current = counterValue;
      return;
    }

    markValidatedObjectiveThresholds(objectives);
    const celebrated = getCelebratedThresholds();

    const sorted = [...objectives].sort((a, b) => a.threshold - b.threshold);
    const crossed = sorted.filter(
      (o) =>
        p < o.threshold &&
        counterValue >= o.threshold &&
        !celebrated.has(o.threshold),
    );

    prevCounterRef.current = counterValue;

    if (crossed.length > 0) {
      addCelebratedThresholds(crossed.map((o) => o.threshold));
      setCelebration(crossed);
      void burstConfetti();
    }
  }, [counterValue, objectives]);

  const clearCelebration = useCallback(() => setCelebration(null), []);

  return { celebration, clearCelebration };
}
