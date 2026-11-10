/** User-tunable Liquid Glass appearance, stored in chrome.storage.sync as `appearance`. */

export const THEMES = ["auto", "light", "dark"] as const;
// Apple system colours: blue, green, indigo, purple, orange, pink, graphite.
export const ACCENTS = ["#0a84ff", "#30d158", "#5e5ce6", "#bf5af2", "#ff9f0a", "#ff375f", "#8e8e93"] as const;

export interface Appearance {
  theme: (typeof THEMES)[number];
  refraction: number;
  depth: number;
  blur: number;
  saturation: number;
  aberration: number;
  specular: number;
  tint: number;
  elasticity: number;
  radius: number;
  scale: number;
  accent: (typeof ACCENTS)[number];
  motion: boolean;
}

/** Slider ranges: [min, max, step]. Also the clamp bounds for stored values. */
export const RANGES = {
  refraction: [0, 150, 1],
  depth: [0.1, 0.5, 0.01],
  blur: [0, 30, 0.5],
  saturation: [100, 220, 5],
  aberration: [0, 6, 0.25],
  specular: [0, 1, 0.05],
  tint: [0, 0.8, 0.01],
  elasticity: [0, 0.4, 0.01],
  radius: [10, 32, 1],
  scale: [0.85, 1.25, 0.05]
} as const satisfies Partial<Record<keyof Appearance, readonly [number, number, number]>>;

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "auto",
  refraction: 90,
  depth: 0.3,
  blur: 3,
  saturation: 170,
  aberration: 1.5,
  specular: 0.75,
  tint: 0.16,
  elasticity: 0,
  radius: 22,
  scale: 1,
  accent: "#0a84ff",
  motion: true
};

export const PRESETS: Record<string, Partial<Appearance>> = {
  Clear: { blur: 1, tint: 0.06, refraction: 100, depth: 0.36, specular: 0.9 },
  Regular: {},
  Frosted: { blur: 16, tint: 0.34, refraction: 55, specular: 0.55, aberration: 0.5 },
  Solid: { blur: 30, tint: 0.78, refraction: 0, aberration: 0, specular: 0.35 }
};

export function normalizeAppearance(raw: unknown): Appearance {
  const input = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_APPEARANCE };
  for (const [key, [min, max]] of Object.entries(RANGES) as [keyof typeof RANGES, readonly number[]][]) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value)) out[key] = Math.min(max, Math.max(min, value));
  }
  const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T) =>
    list.includes(value as T) ? (value as T) : fallback;
  out.theme = pick(THEMES, input.theme, out.theme);
  out.accent = pick(ACCENTS, input.accent, out.accent);
  if (typeof input.motion === "boolean") out.motion = input.motion;
  return out;
}

export function resolveTheme(theme: Appearance["theme"]): "light" | "dark" {
  if (theme !== "auto") return theme;
  return globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
