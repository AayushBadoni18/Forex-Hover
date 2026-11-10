import { flagRegion, isCurrencyCode } from "../shared/currencies.ts";
import { h } from "./dom.ts";

/** Flag image for a currency (SVGs from flag-icons, MIT). Emoji flags don't render on Windows. */
export function flag(code: string, cls = "flag") {
  const src = isCurrencyCode(code) ? chrome.runtime.getURL(`flags/${flagRegion(code)}.svg`) : "";
  return h("img", { class: cls, src, alt: "", decoding: "async", draggable: "false" });
}

export const FLAG_CSS = `
.flag { width: 22px; height: 16px; flex: none; object-fit: cover; border-radius: 3.5px; box-shadow: 0 0 0 0.5px rgba(0,0,0,0.18); background: var(--fill); }
`;
