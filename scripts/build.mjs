import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const outdir = fileURLToPath(new URL("../dist/", import.meta.url));

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: {
    background: "background.js",
    content: "content.js",
    options: "options.js",
    popup: "popup.js",
    priceDetector: "priceDetector.js",
    tooltip: "tooltip.js"
  },
  bundle: true,
  format: "iife",
  target: "chrome114",
  outdir,
  sourcemap: true
});

await Promise.all([
  cp(`${root}/manifest.json`, `${outdir}/manifest.json`),
  cp(`${root}/options.html`, `${outdir}/options.html`),
  cp(`${root}/popup.html`, `${outdir}/popup.html`),
  cp(`${root}/icons`, `${outdir}/icons`, { recursive: true })
]);
