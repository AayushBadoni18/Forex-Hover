/** User-tunable Liquid Glass appearance, stored in chrome.storage.sync as `appearance`. */

export const MATERIALS = ["standard", "prominent", "polar", "frost"] as const;
export const THEMES = ["auto", "light", "dark"] as const;
export const ACCENTS = ["#30d158", "#0a84ff", "#bf5af2", "#ff9f0a", "#ff375f", "#64d2ff"] as const;

export interface Appearance {
  theme: (typeof THEMES)[number];
  material: (typeof MATERIALS)[number];
  displacement: number;
  blur: number;
  saturation: number;
  aberration: number;
  elasticity: number;
  radius: number;
  tint: number;
  accent: (typeof ACCENTS)[number];
  specular: boolean;
  motion: boolean;
  scale: number;
}

/** Slider ranges: [min, max, step]. Also the clamp bounds for stored values. */
export const RANGES = {
  displacement: [0, 150, 1],
  blur: [0, 40, 1],
  saturation: [100, 250, 5],
  aberration: [0, 10, 0.5],
  elasticity: [0, 0.6, 0.01],
  radius: [10, 36, 1],
  tint: [0, 0.8, 0.01],
  scale: [0.85, 1.25, 0.05]
} as const satisfies Partial<Record<keyof Appearance, readonly [number, number, number]>>;

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "auto",
  material: "standard",
  displacement: 70,
  blur: 14,
  saturation: 160,
  aberration: 2,
  elasticity: 0.15,
  radius: 22,
  tint: 0.3,
  accent: "#30d158",
  specular: true,
  motion: true,
  scale: 1
};

export const PRESETS: Record<string, Partial<Appearance>> = {
  Liquid: {},
  Frosted: { material: "frost", blur: 28, tint: 0.45, aberration: 0 },
  Prominent: { material: "prominent", displacement: 110, aberration: 4, blur: 10 },
  Crystal: { material: "polar", displacement: 90, blur: 3, tint: 0.12, saturation: 200 },
  Minimal: { material: "frost", blur: 20, tint: 0.65, elasticity: 0, specular: false }
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
  out.material = pick(MATERIALS, input.material, out.material);
  out.accent = pick(ACCENTS, input.accent, out.accent);
  if (typeof input.specular === "boolean") out.specular = input.specular;
  if (typeof input.motion === "boolean") out.motion = input.motion;
  return out;
}

export function resolveTheme(theme: Appearance["theme"]): "light" | "dark" {
  if (theme !== "auto") return theme;
  return globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
