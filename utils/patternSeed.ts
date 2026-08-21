/**
 * Deterministic seeding for the generative pattern artwork.
 *
 * Everything here is a pure function of the seed string, so the same timetable
 * or user always gets the same artwork across launches and devices — no network
 * request and no surprise photo.
 */

export type PatternPalette = {
  /** Two-stop background wash. */
  background: [string, string];
  /** Foreground ink used for the pattern marks. */
  ink: string;
  /** Secondary ink for accent marks. */
  accent: string;
};

export const PATTERN_KINDS = [
  "grid",
  "arcs",
  "waves",
  "triangles",
  "confetti",
  "rings",
  "diagonals",
  "bauhaus",
] as const;

export type PatternKind = (typeof PATTERN_KINDS)[number];

const PALETTES: PatternPalette[] = [
  { background: ["#1e3a8a", "#2563eb"], ink: "#bfdbfe", accent: "#60a5fa" },
  { background: ["#0f766e", "#14b8a6"], ink: "#ccfbf1", accent: "#5eead4" },
  { background: ["#7c2d12", "#ea580c"], ink: "#fed7aa", accent: "#fdba74" },
  { background: ["#4c1d95", "#7c3aed"], ink: "#ddd6fe", accent: "#a78bfa" },
  { background: ["#831843", "#db2777"], ink: "#fbcfe8", accent: "#f472b6" },
  { background: ["#134e4a", "#0891b2"], ink: "#cffafe", accent: "#67e8f9" },
  { background: ["#1e293b", "#475569"], ink: "#e2e8f0", accent: "#94a3b8" },
  { background: ["#365314", "#65a30d"], ink: "#ecfccb", accent: "#a3e635" },
  { background: ["#78350f", "#d97706"], ink: "#fef3c7", accent: "#fcd34d" },
  { background: ["#500724", "#9d174d"], ink: "#fce7f3", accent: "#f9a8d4" },
];

/** FNV-1a: small, fast, and stable across JS engines. */
const hashSeed = (seed: string) => {
  let hash = 0x811c9dc5;

  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
};

/**
 * Mulberry32 — a tiny PRNG. Seeded from the hash so a given seed always
 * replays the same sequence of numbers.
 */
export const createRandom = (seed: string) => {
  let state = hashSeed(seed) || 1;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type PatternConfig = {
  kind: PatternKind;
  palette: PatternPalette;
  /** Pre-rolled random source, already advanced past the kind/palette picks. */
  random: () => number;
};

export const getPatternConfig = (
  seed: string,
  kind?: PatternKind,
): PatternConfig => {
  const random = createRandom(seed || "pattern");

  const pickedKind =
    kind ?? PATTERN_KINDS[Math.floor(random() * PATTERN_KINDS.length)];
  const palette = PALETTES[Math.floor(random() * PALETTES.length)];

  return { kind: pickedKind, palette, random };
};
