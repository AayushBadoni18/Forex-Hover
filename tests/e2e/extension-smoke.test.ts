import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import puppeteer from "puppeteer-core";

const chromePath = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));

test("the unpacked extension starts and renders its settings surfaces", async (t) => {
  assert.ok(chromePath, "Set CHROME_PATH to a Chrome executable");

  const browser = await puppeteer.launch({
    browser: "chrome",
    executablePath: chromePath,
    headless: true,
    pipe: true,
    enableExtensions: [resolve("dist")]
  });
  t.after(() => browser.close());

  const workerTarget = await browser.waitForTarget(
    (target) => target.type() === "service_worker" && target.url().endsWith("background.js"),
    { timeout: 15_000 }
  );
  const extensionId = new URL(workerTarget.url()).host;
  assert.match(extensionId, /^[a-p]{32}$/);

  for (const [path, selector] of [
    ["popup.html", "#amount"],
    ["options.html", "#all .row"]
  ] as const) {
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) =>
      pageErrors.push(error instanceof Error ? error.message : String(error))
    );
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const response = await page.goto(`chrome-extension://${extensionId}/${path}`, {
      waitUntil: "domcontentloaded"
    });
    assert.ok(response?.ok(), `${path} should load successfully`);
    await page.waitForSelector(selector);
    assert.deepEqual(pageErrors, [], `${path} emitted a page error`);
    if (consoleErrors.length) t.diagnostic(`${path} console: ${consoleErrors.join(" | ")}`);
    await page.close();
  }
});
