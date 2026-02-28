<div align="center">

<img src="icons/icon128.png" alt="Forex Hover Pro Logo" width="96"/>

# Forex Hover Pro

**Instant, multi-currency price conversion — right where you browse.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![ExchangeRate-API](https://img.shields.io/badge/Rates-ExchangeRate--API-00c46a)](https://www.exchangerate-api.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

---

## Why I built this

I was constantly switching tabs just to convert prices while browsing international websites. Whether looking at tech products, courses, or tools, I'd see a price in a foreign currency and immediately open another tab to check what it meant in mine. It was repetitive, distracting, and unnecessary.

**Forex Hover Pro solves that.**

Hover over — or select — any price on any webpage, and it instantly shows the converted value in all your chosen currencies using live exchange rates. No extra tabs. No manual calculations. No friction.

---

## Features

- 🖱️ **Hover to convert** — hover over any detected price and see all conversions in a floating tooltip
- ✂️ **Text selection mode** — highlight any text containing a price and the tooltip appears at your cursor
- 💱 **Multi-currency** — convert to up to 50+ currencies simultaneously in a single tooltip
- 🔢 **Manual converter** — built-in popup calculator to convert any amount between any two currencies
- ↺ **Chained conversions** — pipe a result into the next conversion without retyping
- 🌐 **Domain overrides** — assign the correct base currency to specific sites (e.g. force `amazon.co.uk → GBP`)
- ⚡ **30-minute rate cache** — rates are cached locally so most hovers never touch the network
- 🔒 **Zero tracking** — no analytics, no telemetry, no data leaves your machine except rate requests

---

## Screenshots

### Hover Conversion — Macy's

Hover over any price to see an instant multi-currency breakdown in a floating tooltip.

<table>
  <tr>
    <td><img src="docs/example1.png" alt="Hover tooltip on Macy's product page" width="480"/></td>
    <td><img src="docs/example2.png" alt="Hover tooltip showing selected price on Macy's" width="480"/></td>
  </tr>
  <tr>
    <td align="center"><em>Hover — tooltip appears automatically</em></td>
    <td align="center"><em>Selection mode — highlight a price to convert</em></td>
  </tr>
</table>

### Hover & Selection — Amazon India

Works on any site in any currency — including Indian Rupee, Japanese Yen, and more.

<table>
  <tr>
    <td><img src="docs/example3.png" alt="Hover tooltip on Amazon India search results" width="480"/></td>
    <td><img src="docs/example4.png" alt="Text selection tooltip on Amazon India" width="480"/></td>
  </tr>
  <tr>
    <td align="center"><em>Hover on Amazon.in — ₹ detected and converted</em></td>
    <td align="center"><em>Selection mode — highlight any price in any text</em></td>
  </tr>
</table>

### Popup — Manual Converter

Click the extension icon to open the manual converter. Enter any amount, choose currencies, and convert instantly.

<table>
  <tr>
    <td><img src="docs/popup1.png" alt="Popup converter ready to convert" width="280"/></td>
    <td><img src="docs/popup2.png" alt="Popup converter showing result with Convert again" width="280"/></td>
  </tr>
  <tr>
    <td align="center"><em>Popup — ready to convert</em></td>
    <td align="center"><em>Result panel with exchange rate and Convert again</em></td>
  </tr>
</table>

---

## Installation

> **This extension is not on the Chrome Web Store.** Install it manually as an unpacked extension — takes about 2 minutes.

### Step 1 — Download the extension

Clone this repository or download the ZIP and extract it:

```bash
git clone https://github.com/your-username/forex-hover-pro.git
```

Or click **Code → Download ZIP** on GitHub and extract the folder.

### Step 2 — Get a free API key

1. Go to [exchangerate-api.com](https://www.exchangerate-api.com) and create a free account
2. Copy your API key from the dashboard
3. The free tier gives you **1,500 requests/month** — more than enough for personal use

### Step 3 — Add your API key to `background.js`

Open `background.js` in any text editor. Near the top, find:

```js
// TODO: Replace with your ExchangeRate-API v6 key
const API_KEY = "";
```

Replace the empty string with your key:

```js
const API_KEY = "your_actual_api_key_here";
```

Save the file.

> **Why here and not in settings?**
> Chrome MV3 service workers initialise before `chrome.storage` is accessible on first install. Hardcoding the key in `background.js` guarantees it's available the moment the worker runs — zero race conditions.

### Step 4 — Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `forex-hover-pro` folder

The extension icon will appear in your Chrome toolbar.

### Step 5 — Configure your target currencies

1. Click the extension icon → **Full Settings**
2. Go to **Target Currencies**
3. Select all the currencies you want conversions displayed in
4. Click **Save Settings**

You're done. Visit any website and hover over a price.

---

## Usage

### Hover mode

Any price detected on a page gets a subtle dashed underline. Hover over it to see a tooltip with all your target currencies, the live exchange rate, and how fresh the data is.

### Text selection mode

Highlight any text that contains a price — even inside paragraphs, descriptions, or tables. The tooltip appears at your cursor position automatically. Works on prices that are not wrapped in a standard price element.

### Manual converter (popup)

Click the extension icon to open the popup:

| Control | Action |
|---|---|
| Amount field | Type any number, press **Enter** or click Convert |
| From / To dropdowns | Choose source and target currency (36 currencies) |
| **⇄** Swap button | Swap From and To in one click |
| **Convert** | Fetch the live rate and show the result |
| **✕ Clear** | Reset the result and refocus the amount field |
| **↺ Convert again** | Pipe the result into the next conversion — chain USD → EUR → GBP without retyping |

The conversion history panel shows your last 5 conversions for the current session.

---

## File Structure

```
forex-hover-pro/
├── manifest.json        # Extension manifest (MV3)
├── background.js        # Service worker — rate fetching + caching
├── content.js           # Injected into every page — price detection + tooltip trigger
├── priceDetector.js     # Regex-based price parser (shared by content + tooltip)
├── tooltip.js           # Shadow DOM tooltip — multi-currency result grid
├── popup.html           # Extension popup UI
├── popup.js             # Popup logic — manual converter + status
├── options.html         # Full settings page UI
├── options.js           # Settings logic — currency picker, domain overrides, toggles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Architecture

```
 Page (content.js)                Background (background.js)
 ─────────────────                ──────────────────────────
 TreeWalker scans DOM        →    GET_RATES_MULTI message
 Wraps prices in <span>      ←    Returns { EUR: rate, INR: rate, ... }
 Hover → tooltip (Shadow DOM)     Rate cache: 30-minute TTL per pair
 Selection → tooltip at cursor    Parallel fetches via Promise.all()
```

**Key technical decisions:**

| Decision | Reason |
|---|---|
| **Shadow DOM** for tooltip | Isolates styles from host page — no CSS conflicts on any site |
| **TreeWalker** for price scan | Faster than `querySelectorAll` + regex on large DOM trees |
| **MutationObserver** with debounce | Handles React/Vue/infinite-scroll pages without performance cost |
| **Service Worker** cache | Rates cached 30 min — most hovers never hit the network |
| **Parallel rate fetching** | All target currencies fetched simultaneously via `Promise.all()` |
| **Context invalidation guard** | Catches Chrome's "Extension context invalidated" error silently when the service worker is killed by the browser after idling |

---

## Settings Reference

Open the extension → **Full Settings** to configure:

| Setting | Description |
|---|---|
| **Target Currencies** | Select up to 50+ currencies to show in every tooltip |
| **Setup Guide** | Step-by-step instructions for adding your API key |
| **Domain Rules** | Built-in symbol map (`$→USD`, `€→EUR`, etc.) + per-domain overrides |
| **Behavior** | Master toggle, text selection mode, price underline |
| **About** | Project info, stats, architecture, permissions |

### Domain Overrides

Currency symbols can be ambiguous — `$` could be USD, CAD, AUD, or SGD depending on the site. Use domain overrides to force the correct base currency for specific domains:

```
amazon.co.uk    → GBP
store.apple.com → USD
amazon.com.au   → AUD
```

Matching is suffix-based — `amazon.co.uk` matches all pages under that domain.

---

## Supported Currencies

50+ currencies including:

`USD` `EUR` `GBP` `JPY` `INR` `KRW` `AUD` `CAD` `CHF` `CNY` `MXN` `BRL` `SGD` `HKD` `NOK` `SEK` `DKK` `NZD` `ZAR` `AED` `PLN` `CZK` `HUF` `RON` `TRY` `THB` `MYR` `IDR` `PHP` `VND` `SAR` `QAR` `KWD` `BHD` `ILS` `EGP` `NGN` `GHS` `KES` `CLP` `COP` `PEN` `ARS` `UYU` `PKR` `BDT` `LKR` `NPR` `UAH` `RUB`

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Save your currency preferences and settings |
| `unlimitedStorage` | Cache exchange rates locally |
| `contextMenus` | Right-click context menu integration |
| `tabs` | Broadcast settings changes to open tabs |
| `https://v6.exchangerate-api.com/*` | Fetch live exchange rates |

No other host permissions. The extension cannot read or modify page content on any site beyond what is needed to detect and annotate prices.

---

## Privacy

- **Zero analytics** — no usage data is collected
- **Zero tracking** — no third-party scripts, no fingerprinting
- **No data storage** — your browsing activity never leaves your device
- **Single outbound domain** — the only external requests go to `v6.exchangerate-api.com` for rate data

---

## Troubleshooting

**Tooltip not appearing**
- Check that the extension is enabled (green dot in popup)
- Make sure you added your API key to `background.js` and reloaded the extension
- Try refreshing the page — content scripts need a fresh inject after install

**"Extension context invalidated" in console**
- This is expected behaviour after Chrome reloads or updates the extension
- Refresh the tab to reconnect the content script to the background worker

**Rates not loading / "Rate unavailable"**
- Verify your API key is correct in `background.js`
- Check your monthly request count at [exchangerate-api.com](https://www.exchangerate-api.com) dashboard
- The free tier allows 1,500 requests/month; rates are cached for 30 minutes so normal usage stays well under this limit

**Prices not detected on a specific site**
- Some sites render prices inside `<canvas>`, `<iframe>`, or with heavily obfuscated DOM — these cannot be scanned
- Try text selection mode: highlight the price text manually

---

## Built with

- **Chrome Extensions API** — Manifest V3
- **ExchangeRate-API v6** — live exchange rates
- **Doto** — the extension's UI font (dot-matrix display style)
- Vanilla JS — no frameworks, no build step required

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Add your API key to `background.js` locally (do not commit it)
4. Load as unpacked extension and test
5. Submit a pull request

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.

---

<div align="center">

Developed by **Aayush Badoni**

*A small tool that makes global browsing feel local.*

</div>
