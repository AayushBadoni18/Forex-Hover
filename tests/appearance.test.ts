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
    refraction: -5,
    tint: Number.NaN,
    accent: "red",
    theme: "light",
    motion: false
  });
  assert.equal(a.blur, 30);
  assert.equal(a.refraction, 0);
  assert.equal(a.tint, DEFAULT_APPEARANCE.tint);
  assert.equal(a.accent, DEFAULT_APPEARANCE.accent);
  assert.equal(a.theme, "light");
  assert.equal(a.motion, false);
});

test("the settings and converter backgrounds switch independently", () => {
  const a = normalizeAppearance({ wallpaper: false, panelArt: true });
  assert.equal(a.wallpaper, false);
  assert.equal(a.panelArt, true);
  assert.equal(normalizeAppearance({ panelArt: "yes" }).panelArt, DEFAULT_APPEARANCE.panelArt);
});

test("the background scene is one of the known scenes", () => {
  assert.equal(normalizeAppearance({ scene: "mountains" }).scene, "mountains");
  assert.equal(normalizeAppearance({ scene: "volcano" }).scene, DEFAULT_APPEARANCE.scene);
});
