import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("manifest references local extension entry points", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", root), "utf8")
  ) as chrome.runtime.ManifestV3;

  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.background?.service_worker);

  const files = [
    manifest.background.service_worker,
    manifest.action?.default_popup,
    manifest.options_page,
    ...(manifest.content_scripts?.flatMap(({ js = [] }) => js) ?? [])
  ].filter((file): file is string => Boolean(file));

  await Promise.all(files.map((file) => access(new URL(file, root))));
});
