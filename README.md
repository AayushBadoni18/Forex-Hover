<div align="center">

<img src="./icons/icon128.png" alt="Forex Hover Pro Logo" width="96"/>

# Forex Hover Pro

**Instant, multi-currency price conversion — right where you browse.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![No API key](https://img.shields.io/badge/Setup-No%20API%20key-30d158)](#installation)

</div>

---

## Why I built this

I was constantly switching tabs just to convert prices while browsing international websites. Whether looking at tech products, courses, or tools, I'd see a price in a foreign currency and immediately open another tab to check what it meant in mine. It was repetitive, distracting, and unnecessary.

**Forex Hover Pro solves that.**

Hover over — or select — any price on any webpage, and it instantly shows the converted value in all your chosen currencies. No extra tabs. No manual calculations. No API key. Install it and go.

---

## Features

- 🖱️ **Hover to convert** — hover any detected price and see every conversion in a floating Liquid Glass tooltip
- ✂️ **Text selection mode** — highlight any text containing a price and the tooltip appears at your cursor
- 💱 **Multi-currency** — up to 10 target currencies at once, from a catalog of 50
- 🔢 **Live popup converter** — converts as you type, shows the amount in all your currencies, copy and chain results
- 🕘 **Recent conversions** — kept across popup sessions
- ✨ **Liquid Glass design** — real edge refraction, chromatic aberration, cursor-following highlights and elastic motion, all tunable in Settings (presets, sliders, light/dark/auto, accent colours)
- 🔑 **No API key** — keyless reference rates from ExchangeRate-API with an automatic fallback provider
- 📴 **Works offline** — one cached snapshot per currency; when offline you see the last rates, clearly labelled
- 🌐 **Site rules** — tell it what `$` means on a given site (e.g. `amazon.ca → CAD`)
- 🔒 **Zero tracking** — no analytics, no account; page text never leaves your browser

---

## Screenshots

> These screenshots are from v2. The v3 Liquid Glass UI screenshots are coming soon.

### Hover Conversion — Macy's

<table>
  <tr>
    <td><img src="./readme_images/example1.png" alt="Hover tooltip on Macy's product page" width="480"/></td>
    <td><img src="./readme_images/example2.png" alt="Hover tooltip showing selected price on Macy's" width="480"/></td>
  </tr>
  <tr>
    <td align="center"><em>Hover — tooltip appears automatically</em></td>
    <td align="center"><em>Selection mode — highlight a price to convert</em></td>
  </tr>
</table>

### Hover & Selection — Amazon India

<table>
  <tr>
    <td><img src="./readme_images/example3.png" alt="Hover tooltip on Amazon India search results" width="480"/></td>
    <td><img src="./readme_images/example4.png" alt="Text selection tooltip on Amazon India" width="480"/></td>
  </tr>
  <tr>
    <td align="center"><em>Hover on Amazon.in — ₹ detected and converted</em></td>
    <td align="center"><em>Selection mode — highlight any price in any text</em></td>
  </tr>
</table>

### Popup — Manual Converter

<table>
  <tr>
    <td><img src="./readme_images/popup1.png" alt="Popup converter ready to convert" width="280"/></td>
    <td><img src="./readme_images/popup2.png" alt="Popup converter showing result" width="280"/></td>
  </tr>
</table>

---

## Installation

Requires Node.js 24+.

```sh
git clone https://github.com/AayushBadoni18/Forex-Hover.git
cd Forex-Hover
npm ci --ignore-scripts
npm run build
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `dist/` folder.
3. Open any website and hover a price. That's it — no API key needed.

A Chrome Web Store release is in progress.

## Usage

- **Hover mode** — prices on pages are detected automatically; hover one to see conversions.
- **Selection mode** — select any text containing a price.
- **Popup** — click the toolbar icon for the live converter and your recent conversions.
- **Settings** — choose currencies, tune the glass appearance, toggle selection/underline, and add site rules. Everything saves automatically and applies live in open tabs.

## Development

```sh
npm run typecheck   # TypeScript
npm test            # unit tests (node:test)
npm run test:e2e    # builds, then loads the extension in Chrome
npm run build       # writes the unpacked extension to dist/
```

| Path | Responsibility |
|---|---|
| `manifest.json` | MV3 manifest, permissions, entry points |
| `background.js` | Service worker: validated messages, rate snapshot cache |
| `content.js`, `priceDetector.js` | Page runtime: price detection, hover/selection, live settings |
| `tooltip.js` | Shadow-DOM Liquid Glass tooltip |
| `popup.*`, `options.*` | Popup converter and settings page |
| `src/shared/` | Currency catalog, contracts, validation, parser, formatting, rates |
| `src/ui/` | Glass engine, appearance settings, tooltip view, DOM helpers |
| `tests/` | Unit tests, fixtures, and the Chrome smoke test |

Design and planning docs: [Architecture](ARCHITECTURE.md) · [Decisions](DECISIONS.md) · [Features](FEATURES.md) · [Roadmap](ROADMAP.md) · [Implementation plan](IMPLEMENTATION_PLAN.md) · [Audit](PROJECT_AUDIT.md)

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save your settings, recent conversions and cached rates |
| `open.er-api.com`, `cdn.jsdelivr.net` | Fetch reference exchange rates (primary + fallback) |
| Content script on all sites | Detect prices on the pages you visit |

## Privacy

No account, no analytics, no telemetry. Page text is processed locally and never uploaded; only currency codes are sent to the rate services. Rates are daily mid-market reference rates — not a trading quote.

## Credits

- Rates by [ExchangeRate-API](https://www.exchangerate-api.com), with [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) as a fallback.
- Liquid Glass refraction technique adapted from [liquid-glass-react](https://github.com/rdev/liquid-glass-react) (MIT).
