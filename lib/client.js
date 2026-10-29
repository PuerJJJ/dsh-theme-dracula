/**
 * dsh-theme-dracula — client half.
 *
 * Hand-written ModuleLoader bundle (no build step): the factory returns the
 * module exports, so the browser module system can materialise this package
 * exactly like a compiled plugin.
 *
 * Responsibilities:
 *   - keep `<body data-dsh-dracula>` in sync with the user's on/off choice and
 *     with the active color scheme (Dracula is a dark theme, so the attribute
 *     is only present while the theme runtime reports a dark scheme);
 *   - remember the choice in localStorage, which the host boot script already
 *     reads before the first paint;
 *   - render a Settings -> General row with the switch and a palette preview.
 *
 * The palette itself lives in the host half (`lib/index.js`) as one scoped
 * stylesheet, so there is a single source of truth for the colors.
 */
window.__ModuleLoader__.load({
  id: 'dsh-theme-dracula',
  factory: (require) => {
    const React = require('react')
    const { Switch } = require('@deepseek-ai/dsh-client-ui-primitives')

    /** Locale namespace for the settings row copy. */
    const NS = 'theme-dracula'
    /** localStorage key shared with the host boot script. */
    const STORAGE_KEY = 'dsh-theme-dracula:enabled'
    /** Attribute the host stylesheet keys off. */
    const ATTRIBUTE = 'data-dsh-dracula'
    /** Slot the row registers into. */
    const SLOT = 'settings.general.item'

    const DICTIONARIES = {
      zh: {
        title: 'Dracula 主题',
        description: '用 Dracula 配色覆盖界面颜色。',
        hint: '当前是浅色配色，切换到深色后生效。',
      },
      en: {
        title: 'Dracula theme',
        description: 'Recolor the interface with the Dracula palette.',
        hint: 'The interface is in light mode; switch to dark to see it.',
      },
    }

    /** The eight canonical Dracula hues, used as the row's palette preview. */
    const SWATCHES = ['#ff79c6', '#bd93f9', '#8be9fd', '#50fa7b', '#f1fa8c', '#ffb86c', '#ff5555', '#6272a4']

    const ROW_CSS = String.raw`
.dsh-dracula-row{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}
.dsh-dracula-text{min-width:0}
.dsh-dracula-title{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}
.dsh-dracula-description{margin-top:4px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-dracula-hint{margin-top:4px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsh-dracula-swatches{display:flex;gap:6px;margin-top:10px}
.dsh-dracula-dot{width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 .5px #00000047}
`

    /* ------------------------------------------------------------- state ---- */

    /** Resolve the initial choice: boot global, then storage, then "on". */
    function readEnabled() {
      const boot = globalThis.__DSH_DRACULA__
      if (boot && typeof boot.enabled === 'boolean') return boot.enabled
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === '0') return false
        if (stored === '1') return true
      } catch (error) {
        /* storage unavailable: keep the default */
      }
      return true
    }

    /** Shared, framework-agnostic state watched through useSyncExternalStore. */
    const state = { enabled: readEnabled(), dark: true }
    const listeners = new Set()
    /** Last theme runtime handle, captured by apply(). */
    const runtime = { theme: null }
    /**
     * Frozen-by-convention mirror handed to `useSyncExternalStore`. React only
     * re-renders when `getSnapshot()` returns a different value, so every
     * mutation publishes a fresh object instead of mutating the published one.
     */
    let snapshot = { enabled: state.enabled, dark: state.dark }

    function emit() {
      snapshot = { enabled: state.enabled, dark: state.dark }
      for (const listener of [...listeners]) listener()
    }

    function subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }

    function getSnapshot() {
      return snapshot
    }

    function persist() {
      try {
        localStorage.setItem(STORAGE_KEY, state.enabled ? '1' : '0')
      } catch (error) {
        /* storage unavailable: the choice lasts for this page only */
      }
      if (globalThis.__DSH_DRACULA__) globalThis.__DSH_DRACULA__.enabled = state.enabled
    }

    /** Show the palette only when the user asked for it and the scheme is dark. */
    function paint() {
      if (typeof document === 'undefined' || !document.body) return
      document.body.toggleAttribute(ATTRIBUTE, state.enabled && state.dark)
    }

    function setEnabled(enabled) {
      state.enabled = Boolean(enabled)
      persist()
      // Dracula has no light variant: enabling it on a light scheme asks the
      // theme runtime for dark instead of rendering a half-broken page.
      if (state.enabled && !state.dark) {
        try {
          runtime.theme?.setTheme('dark')
          state.dark = true
        } catch (error) {
          /* an unknown theme id just leaves the scheme alone */
        }
      }
      paint()
      emit()
    }

    /* ---------------------------------------------------------------- UI ---- */

    /**
     * Settings -> General row.
     *
     * @param props - slot props: injected `subscribe`/`getSnapshot`/`setEnabled`
     *   plus the localized `t` seat.
     * @returns the row element tree.
     */
    function DraculaRow({ t, subscribe: watch, getSnapshot: read, setEnabled: write }) {
      const current = React.useSyncExternalStore(watch, read, read)
      const translate = typeof t === 'function' ? t : (key) => DICTIONARIES.en[key] ?? key
      const hint = current.enabled && !current.dark
      const copy = React.createElement(
        'div',
        { className: 'dsh-dracula-text' },
        React.createElement('div', { className: 'dsh-dracula-title' }, translate('title')),
        React.createElement('div', { className: 'dsh-dracula-description' }, translate('description')),
        hint ? React.createElement('div', { className: 'dsh-dracula-hint' }, translate('hint')) : null,
        React.createElement(
          'div',
          { className: 'dsh-dracula-swatches', 'aria-hidden': 'true' },
          SWATCHES.map((color) =>
            React.createElement('span', {
              key: color,
              className: 'dsh-dracula-dot',
              style: { backgroundColor: color },
            }),
          ),
        ),
      )
      return React.createElement(
        'div',
        { className: 'dsh-dracula-row' },
        copy,
        React.createElement(Switch, {
          checked: current.enabled,
          onChange: (next) => write(next),
          label: translate('title'),
        }),
      )
    }

    /* ------------------------------------------------------------- plugin --- */

    /** Services the plugin needs before it may apply. */
    const inject = ['theme', 'slots', 'locale']

    /**
     * Mount the palette switch.
     *
     * @param ctx - client plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'theme-dracula: locale')

      ctx.effect(() => {
        if (typeof document === 'undefined') return () => {}
        if (document.querySelector('style[data-plugin="dsh-theme-dracula"]')) return () => {}
        const tag = document.createElement('style')
        tag.dataset.plugin = 'dsh-theme-dracula'
        tag.textContent = ROW_CSS
        document.head.appendChild(tag)
        return () => tag.remove()
      }, 'theme-dracula: row styles')

      runtime.theme = ctx.theme
      state.dark = ctx.theme.getTheme().active.colorScheme === 'dark'
      paint()

      // The boot script owns the attribute before mount; from here on the
      // runtime's scheme changes drive it.
      ctx.on('theme/change', (snapshot) => {
        const dark = snapshot.active.colorScheme === 'dark'
        if (dark === state.dark) return
        state.dark = dark
        paint()
        emit()
      })

      ctx.slots.inject(SLOT, () =>
        ctx.slots.register(
          {
            name: SLOT,
            id: 'dracula',
            order: 12,
            locale: NS,
            inject: () => ({ subscribe, getSnapshot, setEnabled }),
          },
          DraculaRow,
        ),
      )
    }

    return { apply, inject }
  },
})
