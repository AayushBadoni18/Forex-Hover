# Privacy Policy — Forex Hover Pro

_Last updated: 11 November 2026_

Forex Hover Pro does not collect, store, sell or share any personal data. There are no accounts, no analytics and no tracking.

## What stays on your device

- **Settings** (your currencies, appearance, card fee, site rules and paused sites) are saved with the browser's extension storage. If browser sync is on, the browser syncs them between your own devices.
- **Recent conversions**, the converter's position and the cached exchange rates are saved locally and never leave your device.
- **Page text** is read locally to find prices. It is never stored or sent anywhere.

## Network requests

The extension makes one kind of request: downloading exchange rates as JSON (today's, and the rates from a week ago for the weekly trend).

- `cdn.jsdelivr.net` (currency-api by Fawaz Ahmed), the primary source
- `open.er-api.com` (ExchangeRate-API), used only if the primary source fails

These requests carry no information about you, the pages you visit or the prices you look at. As with any web request, the provider's server sees your IP address.

What you type after `fx` in the address bar is converted inside the extension and is not sent anywhere.

## Permissions

- **storage**: save settings and cached rates.
- **activeTab** and **scripting**: when you click the toolbar icon on a tab that was open before the extension was installed, add the extension's own bundled scripts to that tab so the converter can open.
- **Access to all sites** (content script): prices can appear on any site, so detection has to be able to run on any site.

## Contact

Questions or concerns: open an issue at https://github.com/AayushBadoni18/Forex-Hover/issues
