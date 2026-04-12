/**
 * Mémorise sur l’appareil les paliers déjà « célébrés » pour ne pas rejouer l’animation
 * (refresh, rechargement des données, etc.). Les objectifs validés sont aussi marqués
 * pour éviter une animation qui ferait croire qu’il reste un défi à faire.
 */
const KEY = "leo_evq_celebrated_thresholds";

function readSet(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is number => typeof x === "number"));
  } catch {
    return new Set();
  }
}

function writeSet(s: Set<number>) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify([...s].sort((a, b) => a - b)),
    );
  } catch {
    /* quota / mode privé */
  }
}

export function getCelebratedThresholds(): Set<number> {
  return readSet();
}

/** Enregistre les paliers pour lesquels l’animation a déjà été montrée sur cet appareil. */
export function addCelebratedThresholds(thresholds: number[]) {
  if (thresholds.length === 0) return;
  const s = readSet();
  for (const t of thresholds) s.add(t);
  writeSet(s);
}

/** Objectifs validés = palier « terminé », pas d’animation de défi à refaire. */
export function markValidatedObjectiveThresholds(
  objectives: { threshold: number; status: string }[],
) {
  if (objectives.length === 0) return;
  const s = readSet();
  let changed = false;
  for (const o of objectives) {
    if (o.status === "validated" && !s.has(o.threshold)) {
      s.add(o.threshold);
      changed = true;
    }
  }
  if (changed) writeSet(s);
}

/** Après reset admin du compteur, on peut à nouveau célébrer des paliers. */
export function clearCelebratedThresholds() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
