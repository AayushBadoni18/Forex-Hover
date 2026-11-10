import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "../src/ui/appearance.ts";

test("garbage storage falls back to defaults", () => {
  assert.deepEqual(normalizeAppearance(null), DEFAULT_APPEARANCE);
  assert.deepEqual(normalizeAppearance("x"), DEFAULT_APPEARANCE);
});

test("values are clamped and enums are checked", () => {
  const a = normalizeAppearance({
    blur: 999,
    displacement: -5,
    tint: Number.NaN,
    material: "lava",
    accent: "red",
    theme: "light",
    motion: false
  });
  assert.equal(a.blur, 40);
  assert.equal(a.displacement, 0);
  assert.equal(a.tint, DEFAULT_APPEARANCE.tint);
  assert.equal(a.material, "standard");
  assert.equal(a.accent, DEFAULT_APPEARANCE.accent);
  assert.equal(a.theme, "light");
  assert.equal(a.motion, false);
});
