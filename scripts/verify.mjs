/**
 * Offline checks for dsh-theme-dracula.
 *
 * Verifies the two halves against minimal stand-ins for the Host and browser
 * APIs they touch, so a broken bundle is caught before it reaches a profile:
 *
 *   node scripts/verify.mjs
 *
 * `--audit <alias-table.txt>` additionally compares the stylesheet against a
 * `token | light | dark` dump of the shipped palette and reports every alias
 * token the theme does not restate.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

let failures = 0
function check(label, condition, detail) {
  if (condition) {
    console.log(`  ok   ${label}`)
    return
  }
  failures += 1
  console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
}

/* ------------------------------------------------------------- host half --- */

console.log('host half')
const host = await import(resolve(root, 'lib/index.js'))
check('exports apply()', typeof host.apply === 'function')
check('exports entry name', host.name === 'theme-dracula')

const table = []
host.apply({ on: (event, listener) => event === 'webserver/index-inject' && listener(table) })

const style = table.find((row) => row.kind === 'style')
const script = table.find((row) => row.kind === 'script')
check('injects one style row', Boolean(style))
check('injects one body script', script?.placement === 'body')

const css = style?.text ?? ''
check('scoped to the attribute', css.includes(':root:root body[data-dsh-dracula]'))
check('restates the base surface', css.includes('--dsw-alias-bg-base: #20212b'))
check('restates a specific token', css.includes('--dsw-specific-sidebar-fill: #282a36'))
check('themes syntax highlighting', css.includes('--shiki-token-keyword: #ff79c6'))

const open = (css.match(/\{/g) ?? []).length
const close = (css.match(/\}/g) ?? []).length
check('balanced braces', open === close, `${open} { vs ${close} }`)

let bootOk = true
try {
  new Function(script?.text ?? '')
} catch (error) {
  bootOk = false
  check('boot script parses', false, error.message)
}
check('boot script parses', bootOk)
check('boot script reads storage', (script?.text ?? '').includes('dsh-theme-dracula:enabled'))
check('boot script follows the scheme', (script?.text ?? '').includes('data-ds-dark-theme'))

/* ----------------------------------------------------------- client half --- */

console.log('client half')
const attributes = new Set()
const headChildren = []
const storage = new Map()
let factory = null

globalThis.window = {
  __ModuleLoader__: {
    load: ({ id, factory: created }) => {
      if (id !== 'dsh-theme-dracula') throw new Error(`unexpected module id ${id}`)
      factory = created
    },
  },
}
globalThis.document = {
  body: {
    toggleAttribute: (name, on) => (on ? attributes.add(name) : attributes.delete(name)),
    hasAttribute: (name) => attributes.has(name),
    setAttribute: (name) => attributes.add(name),
    removeAttribute: (name) => attributes.delete(name),
  },
  head: { appendChild: (node) => headChildren.push(node) },
  querySelector: (selector) => headChildren.find((node) => selector.includes(node.dataset.plugin)) ?? null,
  createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
}
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
}

const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
}
const Switch = function Switch() {}

await import(resolve(root, 'lib/client.js'))
check('registers a loader module', typeof factory === 'function')

const client = factory((id) => {
  if (id === 'react') return React
  if (id === '@deepseek-ai/dsh-client-ui-primitives') return { Switch }
  throw new Error(`unexpected require(${id})`)
})
check('exports apply()', typeof client.apply === 'function')
check('exports service inject list', JSON.stringify(client.inject) === JSON.stringify(['theme', 'slots', 'locale']))

let scheme = 'dark'
const themeListeners = []
const registered = { locale: null, slots: [], row: null, rowComponent: null }
const ctx = {
  effect: (fn) => fn(),
  on: (event, listener) => {
    if (event === 'theme/change') themeListeners.push(listener)
  },
  locale: { register: (ns, dictionaries) => void (registered.locale = { ns, dictionaries }) },
  slots: {
    inject: (name, factoryFn) => registered.slots.push(name) && factoryFn(),
    register: (descriptor, component) => {
      registered.row = descriptor
      registered.rowComponent = component
    },
  },
  theme: {
    getTheme: () => ({ active: { colorScheme: scheme }, themes: [] }),
    setTheme: (id) => {
      scheme = id === 'dracula' ? 'dark' : id
    },
  },
}

client.apply(ctx)
check('registers the dictionary pair', Boolean(registered.locale?.dictionaries?.zh && registered.locale?.dictionaries?.en))
check('registers into the General item slot', registered.slots[0] === 'settings.general.item')
check('declares the locale namespace', registered.row?.locale === 'theme-dracula')
check('attributes the palette while dark', attributes.has('data-dsh-dracula'))

themeListeners.forEach((listener) => listener({ active: { colorScheme: 'light' } }))
check('drops the palette on a light scheme', !attributes.has('data-dsh-dracula'))

themeListeners.forEach((listener) => listener({ active: { colorScheme: 'dark' } }))
check('restores the palette on dark', attributes.has('data-dsh-dracula'))

const props = registered.row.inject()
const tree = registered.rowComponent({ ...props, t: (key) => key })
check('row renders a switch', tree.children[1]?.type === Switch)
const swatches = tree.children[0]?.children?.[3]
const dots = Array.isArray(swatches?.children?.[0]) ? swatches.children[0] : (swatches?.children ?? [])
check('row previews the palette', dots.length === 8, `got ${dots.length}`)

props.setEnabled(false)
check('toggle off clears the attribute', !attributes.has('data-dsh-dracula'))
check('toggle off persists the choice', storage.get('dsh-theme-dracula:enabled') === '0')
props.setEnabled(true)
check('toggle on drives dark when needed', attributes.has('data-dsh-dracula'))

/* ------------------------------------------------------------ optional ---- */

const auditIndex = process.argv.indexOf('--audit')
if (auditIndex !== -1) {
  const tablePath = process.argv[auditIndex + 1]
  if (!tablePath) {
    console.log('audit skipped: pass the path to a token table')
  } else {
    console.log('palette audit')
    // The reference dump lists alias tokens bare ("bg-base | #fff | #151517"),
    // while explicit entries already carry a --dsw- prefix.
    const tokens = readFileSync(tablePath, 'utf8')
      .split('\n')
      .map((line) => line.split('|')[0]?.trim())
      .filter((token) => token && !token.includes(' '))
      .map((token) => (token.startsWith('--') ? token : `--dsw-alias-${token}`))
    const missing = [...new Set(tokens)].filter((token) => !css.includes(`${token}:`))
    check(`all ${new Set(tokens).size} shipped tokens are restated`, missing.length === 0, missing.join(', '))
  }
}

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) failed`)
process.exitCode = failures === 0 ? 0 : 1
