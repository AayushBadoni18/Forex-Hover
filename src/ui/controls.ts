/** Controls shared by the floating panel, the fallback window and the settings page. */
export const CONTROLS_CSS = `
/* :where() keeps these resets at zero specificity so component colours win. */
:where([data-theme]) *, :where([data-theme]) *::before, :where([data-theme]) *::after { box-sizing: border-box; }
:where([data-theme]) :where(button, input, select) { font: inherit; color: inherit; letter-spacing: inherit; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Glass panels hold text, so they keep enough body to stay readable. */
.panel > .lg-warp { background: rgb(28 28 30 / max(var(--lg-tint-a), 0.42)); }
[data-theme="light"] .panel > .lg-warp { background: rgb(255 255 255 / max(var(--lg-tint-a), 0.5)); }

/* Clear liquid mode: panels are pure refracting glass; frost sits only behind text. */
[data-liquid="on"] .panel { --lg-blur: 2px; }
[data-liquid="on"] .panel > .lg-warp { background: transparent; }
[data-liquid="on"] .txt, [data-liquid="on"] .panel .row {
  background: rgb(28 28 30 / 0.36);
  backdrop-filter: blur(14px) saturate(170%);
  -webkit-backdrop-filter: blur(14px) saturate(170%);
  border-radius: 12px;
}
[data-theme="light"][data-liquid="on"] .txt,
[data-theme="light"][data-liquid="on"] .panel .row { background: rgb(255 255 255 / 0.5); }
[data-liquid="on"] .panel .row { margin: 4px 8px; }
[data-liquid="on"] .panel .row + .row::before { display: none; }

/* Switch (iOS) */
.switch { position: relative; width: 42px; height: 26px; flex: none; }
.switch input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; z-index: 1; }
.switch span { position: absolute; inset: 0; border-radius: 13px; background: var(--fill-2); transition: background-color 0.2s var(--ease); }
.switch span::after {
  content: ""; position: absolute; top: 2px; left: 2px; width: 22px; height: 22px; border-radius: 50%;
  background: #fff; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.22); transition: transform 0.2s var(--ease);
}
.switch input:checked + span { background: #30d158; }
.switch input:checked + span::after { transform: translateX(16px); }
.switch input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 0; cursor: pointer;
  border-radius: 999px; padding: 7px 15px; font-size: 13px; font-weight: 500; background: var(--fill); transition: background-color 0.15s var(--ease);
}
.btn:hover { background: var(--fill-2); }
.btn:focus-visible, .link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn.primary { background: var(--accent); color: #fff; }
.link { border: 0; background: none; padding: 0; cursor: pointer; color: var(--accent-text); font-size: 13px; font-weight: 500; }
.link:hover { text-decoration: underline; }
.icon-btn {
  width: 32px; height: 32px; padding: 0; border-radius: 50%; display: grid; place-items: center; border: 0; cursor: pointer;
  color: var(--fg); background: var(--fill); transition: background-color 0.15s var(--ease), transform 0.3s var(--ease);
}
.icon-btn:hover { background: var(--fill-2); }
.icon-btn.spin:hover { transform: rotate(30deg); }
.icon-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* Logo mark (no background) */
.logo { width: 30px; height: 30px; flex: none; color: var(--fg); }

/* Grouped list inside a glass panel */
.group { border-radius: var(--lg-radius); }
.row { display: flex; align-items: center; gap: 12px; min-height: 46px; padding: 9px 16px; position: relative; }
.row + .row::before { content: ""; position: absolute; top: 0; left: 16px; right: 16px; border-top: 0.5px solid var(--hairline); }
.row .text { flex: 1; min-width: 0; }
.row .text b { display: block; font-weight: 500; font-size: 14px; }
.row .text small { display: block; color: var(--fg-2); font-size: 12px; margin-top: 1px; }
.section-title { margin: 22px 16px 7px; font-size: 12px; font-weight: 600; color: var(--fg-2); text-transform: uppercase; letter-spacing: 0.03em; }
.search {
  width: 100%; border: 0; outline: 0; border-radius: 10px; padding: 8px 12px 8px 32px; background: var(--fill);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%238e8e93' stroke-width='1.8'%3E%3Ccircle cx='6' cy='6' r='4.6'/%3E%3Cpath d='m9.6 9.6 3.4 3.4' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: 11px 50%;
}
.search:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent); }
`;
