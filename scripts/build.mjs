import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { CURRENCIES, flagRegion } from "../src/shared/currencies.ts";

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
    tooltip: "tooltip.js"
  },
  bundle: true,
  format: "iife",
  target: "chrome114",
  outdir,
  sourcemap: true,
  // Packaged assets, resolved by the extension at runtime.
  external: ["/fonts/*", "/flags/*"]
});

await Promise.all([
  cp(`${root}/manifest.json`, `${outdir}/manifest.json`),
  cp(`${root}/options.html`, `${outdir}/options.html`),
  cp(`${root}/popup.html`, `${outdir}/popup.html`),
  cp(`${root}/icons`, `${outdir}/icons`, { recursive: true }),
  // Inter (OFL) for non-Apple platforms; SF Pro is used where installed.
  cp(`${root}/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2`, `${outdir}/fonts/inter.woff2`),
  // Only the flags the currency catalog uses (flag-icons, MIT).
  ...CURRENCIES.map(({ code }) =>
    cp(`${root}/node_modules/flag-icons/flags/4x3/${flagRegion(code)}.svg`, `${outdir}/flags/${flagRegion(code)}.svg`)
  )
]);
