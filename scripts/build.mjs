import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
    panel: "panel.js",
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

// Licence notices for bundled third-party code and assets (required by MIT/OFL).
const notices = [
  ["liquid-glass-react (refraction technique)", "licenses/liquid-glass-react.txt"],
  ["flag-icons (flag images)", "node_modules/flag-icons/LICENSE"],
  ["Inter (typeface)", "node_modules/@fontsource-variable/inter/LICENSE"]
];
const sections = await Promise.all(
  notices.map(async ([name, file]) => `== ${name} ==\n\n${await readFile(`${root}/${file}`, "utf8")}`)
);
await writeFile(`${outdir}/THIRD_PARTY_NOTICES.txt`, sections.join("\n\n"));
