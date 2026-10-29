/**
 * dsh-theme-dracula — host half.
 *
 * The whole theme is one stylesheet plus a tiny boot script. Both ride the
 * `webserver/index-inject` tap that `@deepseek-ai/dsh-client-ui-theme` uses for
 * its own no-flash boot styles, so the palette is on screen with the first
 * paint instead of appearing after the client tree mounts.
 *
 *   <style>   the Dracula palette, scoped to `body[data-dsh-dracula]`
 *   <script>  restores that attribute from localStorage before the body paints
 *
 * Nothing here owns state: the client half toggles the attribute, and the
 * stylesheet is inert while the attribute is absent. The DOM attribute — not a
 * theme id — carries the choice because `ctx.theme.setTheme()` only persists
 * the built-in preferences, and a registered theme id would be reverted by the
 * settings scope whenever the user touches a font setting.
 *
 * The tones follow the official DeepSeek port (dracula/deepseek): the page
 * sits on `#20212b`, the sidebar and code blocks on `#282a36`, raised cards on
 * `#2e3040`, and anything selected or floating on `#44475a`.
 */

/** Attribute the client half toggles on `<body>`. */
const ATTRIBUTE = 'data-dsh-dracula'

/** localStorage key shared with the client half and the boot script. */
const STORAGE_KEY = 'dsh-theme-dracula:enabled'

/**
 * Dracula palette.
 *
 * Every `--dsw-alias-*` token from the shipped design platform is restated so
 * nothing falls back to the default dark palette, then the `--dsw-specific-*`
 * layer (sidebar, composer, menus) and the syntax-highlighting variables that
 * the theme runtime cannot reach through `ctx.theme.register()`.
 *
 * The doubled `:root` is deliberate: it lifts the rule to (0,3,1) so the
 * override outranks the bundled palette — including the macOS-only
 * `html[data-platform=darwin] body[data-ds-dark-theme]` rule (0,2,2) — no
 * matter which order the stylesheets land in the document.
 */
const DRACULA_CSS = String.raw`
/* ---------------------------------------------------------------- surfaces */

:root:root body[${ATTRIBUTE}] {
  color-scheme: dark;

  --dsh-boot-bg: #20212b;
  background-color: #20212b;

  --dsw-alias-bg-base: #20212b;
  --dsw-alias-bg-document-preview: #282a36;
  --dsw-alias-bg-document-selection: color-mix(in srgb, #bd93f9 40%, transparent);
  --dsw-alias-bg-layer-1: #282a36;
  --dsw-alias-bg-layer-2: #2e3040;
  --dsw-alias-bg-layer-3: #44475a;
  --dsw-alias-bg-mask-1: #20212bcc;
  --dsw-alias-bg-mask-2: #0000004d;
  --dsw-alias-bg-mask-3: #20212be6;
  --dsw-alias-bg-mask-drop: #191a21b3;
  --dsw-alias-bg-mask-photo: #20212be0;
  --dsw-alias-bg-module-platform: #2e3040;
  --dsw-alias-bg-multi-select: #2e3040;
  --dsw-alias-bg-overlay: #44475a;
  --dsw-alias-bg-skeleton: #f8f8f212;

  /* --------------------------------------------------------------- borders */

  --dsw-alias-border-inverted: #f8f8f20f;
  --dsw-alias-border-inverted2: #f8f8f214;
  --dsw-alias-border-l1: #6272a41f;
  --dsw-alias-border-l2: #6272a433;
  --dsw-alias-border-l2-darkmode-thin: #6272a41f;
  --dsw-alias-border-l3: #6272a44d;
  --dsw-alias-border-l4: #6272a466;

  /* ----------------------------------------------------------------- brand */

  --dsw-alias-brand-primary: #bd93f9;
  --dsw-alias-brand-primary-invert: #f8f8f2;
  --dsw-alias-brand-primary-new-colorprimary-new-color: #bd93f9;
  --dsw-alias-brand-text: #8be9fd;

  /* ------------------------------------------------------------------ text */

  --dsw-alias-label-primary: #f8f8f2;
  --dsw-alias-label-primary-bluish: #f8f8f2;
  --dsw-alias-label-primary-dimmed: #e8eaf4;
  --dsw-alias-label-primary-foreground: #20212b;
  --dsw-alias-label-primary-inverted: #20212b;
  --dsw-alias-label-secondary: #bbc4de;
  --dsw-alias-label-tertiary: #9ba9d0;
  --dsw-alias-label-caption: #6272a4;
  --dsw-alias-label-dimmed: #44475a;
  --dsw-alias-label-document-preview: #bbc4de;
  --dsw-alias-label-deep-diving: #bd93f9;
  --dsw-alias-label-deep-diving-shimmer: color-mix(in srgb, #8be9fd 45%, transparent);
  --dsw-alias-label-shimmer: color-mix(in srgb, #f8f8f2 45%, transparent);
  --dsw-alias-link: #8be9fd;

  /* --------------------------------------------------------------- buttons */

  --dsw-alias-button-primary-fill: #bd93f9;
  --dsw-alias-button-primary-hover: #a97dfa;
  --dsw-alias-button-primary-dimmed: #5a3e99;
  --dsw-alias-button-contrast-fill: #f8f8f2;
  --dsw-alias-button-elevated-fill: #44475a;
  --dsw-alias-button-floating-fill: #2e3040;
  --dsw-alias-button-floating-hover: #44475a;
  --dsw-alias-button-ghost-active-border: #6272a4;
  --dsw-alias-button-ghost-active-fill: #44475a;
  --dsw-alias-button-ghost-active-hover: #52566b;
  --dsw-alias-button-info-fill: #8be9fd;
  --dsw-alias-button-info-hover: #a9f0ff;
  --dsw-alias-button-tool-bar-fill: #44475a80;
  --dsw-alias-button-tool-bar-fill-invisible: #20212b5c;
  --dsw-alias-button-tool-bar-hover: #52566b99;

  /* ----------------------------------------------------------- interaction */

  --dsw-alias-interactive-bg-active: #f8f8f224;
  --dsw-alias-interactive-bg-hover: #f8f8f214;
  --dsw-alias-interactive-bg-hover-accent: #bd93f93d;
  --dsw-alias-interactive-bg-hover-danger: #ff55552b;
  --dsw-alias-interactive-bg-hover-solid: #44475a;

  /* ---------------------------------------------------------------- states */

  --dsw-alias-state-business-primary: #8be9fd;
  --dsw-alias-state-business-tertiary: #22343c;
  --dsw-alias-state-error-primary: #ff5555;
  --dsw-alias-state-error-secondary: #ff6e6e;
  --dsw-alias-state-idle-primary: #6272a4;
  --dsw-alias-state-success-primary: #50fa7b;
  --dsw-alias-state-success-secondary: #6bfb90;
  --dsw-alias-state-success-tertiary: #1d3a2a;
  --dsw-alias-state-warn-label: #ffb86c;
  --dsw-alias-state-warn-primary: #ffb86c;
  --dsw-alias-state-warn-secondary: #ffc98a;
  --dsw-alias-state-warn-tertiary: #3a2f22;
  --dsw-alias-code-diff-added: #50fa7b1f;
  --dsw-alias-code-diff-deleted: #ff55551f;
  --dsw-alias-file-diff-added-bg: #24352b;
  --dsw-alias-file-diff-added-gutter: #1d2d23;
  --dsw-alias-file-diff-added-marker: #50fa7b;
  --dsw-alias-file-diff-deleted-bg: #3a2430;
  --dsw-alias-file-diff-deleted-gutter: #2e1b26;
  --dsw-alias-file-diff-deleted-marker: #ff5555;

  /* -------------------------------------------------------------- markdown */

  --dsw-alias-markdown-citation: #44475a;
  --dsw-alias-markdown-code-block: #282a36;
  --dsw-alias-markdown-code-block-banner: #20212b;
  --dsw-alias-markdown-code-segment-selected: #44475a;
  --dsw-alias-markdown-code-segment-unselected: #2e3040;
  --dsw-alias-markdown-inline-code: #44475a;
  --dsw-alias-markdown-placeholder: #2e3040;
  --dsw-alias-markdown-tag: #44475a;

  /* --------------------------------------------------- chrome and overlays */

  --dsw-alias-menu-group-header-fill: #20212bf0;
  --dsw-alias-menu-icon: #f8f8f2;
  --dsw-alias-scrollbar-bg-l1: #6272a466;
  --dsw-alias-scrollbar-bg-l2: #6272a480;
  --dsw-alias-scrollbar-hover-l1: #bd93f999;
  --dsw-alias-scrollbar-hover-l2: #bd93f9cc;
  --dsw-alias-switch-thumb: #f8f8f2;
  --dsw-alias-toast-bg: #44475a;
  --dsw-alias-toast-label: #f8f8f2;
  --dsw-alias-tooltip-bg: #44475a;
  --dsw-alias-tooltip-key-bg: color-mix(in srgb, #44475a, white 18%);
  --dsw-alias-turn-trigger-bg: #f8f8f214;
  --dsw-alias-turn-trigger-bg-hover: #f8f8f224;

  /* ------------------------------------------- module surfaces (specific-*) */

  --dsw-specific-bubble: #2e3040;
  --dsw-specific-bubble-highlight: #44475a;
  --dsw-specific-input-major: #2e3040;
  --dsw-specific-login-input: #282a36;
  --dsw-specific-selector: #2e3040;
  --dsw-specific-sidebar-fill: #282a36;
  --dsw-specific-sidebar-nav-item-active: #44475a;
  --dsw-specific-sidebar-nav-item-active-accent: #4b3f6b;
  --dsw-specific-sidebar-nav-item-hover: #2e3040;
  --dsw-specific-tip: #2e3040;
  --dsw-menu-surface-fill: #282a36f0;
  --dsw-specific-menu: var(--dsw-menu-surface-fill);

  /* ----------------------------------------------------- markdown gradients */

  --dsw-linear-gradient-think: linear-gradient(180deg, #20212b 20.19%, #20212b00 100%);
  --dsw-linear-think-select: linear-gradient(180deg, #2e3040 20.19%, #2e304000 100%);

  /* ------------------------------ syntax highlighting (shiki css-variables) */

  --shiki-foreground: var(--dsw-alias-label-primary);
  --shiki-background: var(--dsw-alias-markdown-code-block);
  --shiki-token-constant: #f1fa8c;
  --shiki-token-string: #f1fa8c;
  --shiki-token-string-expression: #8be9fd;
  --shiki-token-comment: #6272a4;
  --shiki-token-keyword: #ff79c6;
  --shiki-token-parameter: #8be9fd;
  --shiki-token-function: #50fa7b;
  --shiki-token-punctuation: #f8f8f2;
  --shiki-token-link: #8be9fd;
}

/* Text selection: the accent at 42% rather than the current-line grey, which is
   also the inline-code surface — a grey selection on a grey chip is invisible. */
:root:root body[${ATTRIBUTE}] ::selection {
  background-color: color-mix(in srgb, #bd93f9 42%, transparent);
  color: #f8f8f2;
}
`

/**
 * Boot script: restore the attribute from localStorage before the first paint,
 * then keep it in lockstep with the theme runtime's `data-ds-dark-theme`
 * marker. Dracula is a dark theme, so the attribute only goes on while the
 * runtime reports a dark color scheme; the MutationObserver covers both
 * injection orders (`ui-theme` prepends its own boot script that sets the
 * marker) and every later light/dark switch.
 *
 * The stored value is also published as `globalThis.__DSH_DRACULA__` so the
 * client half reuses the same answer without a storage read.
 */
const BOOT_SCRIPT = String.raw`
(function () {
  var STORAGE_KEY = ${JSON.stringify(STORAGE_KEY)};
  var ATTRIBUTE = ${JSON.stringify(ATTRIBUTE)};

  var enabled = true;
  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '0') enabled = false;
    else if (stored === '1') enabled = true;
  } catch (error) {
    /* storage unavailable: keep the default */
  }
  globalThis.__DSH_DRACULA__ = { enabled: enabled, storageKey: STORAGE_KEY };

  var body = document.body;
  if (!body) return;

  function sync() {
    var dark = body.hasAttribute('data-ds-dark-theme');
    if (enabled && dark) body.setAttribute(ATTRIBUTE, '');
    else body.removeAttribute(ATTRIBUTE);
  }

  sync();
  new MutationObserver(sync).observe(body, {
    attributes: true,
    attributeFilter: ['data-ds-dark-theme'],
  });
})();
`

/** Loader entry id, also used as the client module id. */
export const name = 'theme-dracula'

/**
 * Register the index injections. The rows are rebuilt for every page render,
 * so a client-side toggle needs no host restart.
 *
 * @param ctx - plugin context.
 */
export function apply(ctx) {
  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'style', text: DRACULA_CSS })
    table.push({ kind: 'script', placement: 'body', text: BOOT_SCRIPT })
  })
}
