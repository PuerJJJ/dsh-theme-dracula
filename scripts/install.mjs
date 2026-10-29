/**
 * Link dsh-theme-dracula into a DSH profile.
 *
 *   node scripts/install.mjs --profile desktop            # show the plan
 *   node scripts/install.mjs --profile desktop --apply    # write it
 *   node scripts/install.mjs --profile desktop --uninstall --apply
 *
 * The plugin is symlinked from this workspace instead of copied, so editing the
 * palette here is picked up by the next DSH start. Nothing else in the profile
 * is touched: the package ships its own `dsh.bundle.patch.yml`, which is what
 * inserts the Loader entry once the package name appears in
 * `dsh.profile.bundles`.
 *
 * Writes land under `$DSH_HOME` (default `~/.dsh`), outside the session
 * workspace, so the DSH file sandbox has to allow them for `--apply`.
 */
import { existsSync, lstatSync, readFileSync, symlinkSync, unlinkSync, writeFileSync, copyFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageName = 'dsh-theme-dracula'
const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function argument(flag, fallback) {
  const index = process.argv.indexOf(flag)
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const profileName = argument('--profile', 'desktop')
const apply = process.argv.includes('--apply')
const uninstall = process.argv.includes('--uninstall')
const home = process.env.DSH_HOME || join(homedir(), '.dsh')
const profileDir = join(home, 'profiles', profileName)
const manifestPath = join(profileDir, 'package.json')
const linkPath = join(profileDir, 'node_modules', packageName)

if (!existsSync(manifestPath)) {
  console.error(`no profile manifest at ${manifestPath}`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const bundles = manifest.dsh?.profile?.bundles ?? []
const alreadyListed = bundles.includes(packageName)

console.log(`plugin     ${pluginRoot}`)
console.log(`profile    ${profileDir}`)
console.log(`manifest   ${alreadyListed ? 'lists' : 'does not list'} ${packageName}`)
console.log(`node_modules/${packageName} ${existsSync(linkPath) ? `exists (${lstatSync(linkPath).isSymbolicLink() ? 'symlink' : 'directory'})` : 'missing'}`)

if (!apply) {
  console.log(`\ndry run: pass --apply to ${uninstall ? 'remove the link and the bundle entry' : 'link the package and register the bundle'}`)
  process.exit(0)
}

/* ----------------------------------------------------------- uninstall ---- */

if (uninstall) {
  try {
    if (lstatSync(linkPath).isSymbolicLink()) {
      unlinkSync(linkPath)
      console.log(`unlinked   ${linkPath}`)
    } else {
      console.log(`left ${linkPath} alone: it is not a symlink`)
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  if (!alreadyListed) {
    console.log('bundles    not registered')
  } else {
    copyFileSync(manifestPath, `${manifestPath}.bak-dracula`)
    const next = {
      ...manifest,
      dsh: {
        ...manifest.dsh,
        profile: {
          ...manifest.dsh?.profile,
          bundles: bundles.filter((name) => name !== packageName),
        },
      },
    }
    writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`)
    console.log(`bundles    removed ${packageName} (backup: package.json.bak-dracula)`)
  }
  process.exit(0)
}

/* ------------------------------------------------------------- symlink ---- */

let existing = null
try {
  existing = lstatSync(linkPath)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

if (existing) {
  if (!existing.isSymbolicLink()) {
    console.error(`refusing to replace ${linkPath}: it is not a symlink`)
    process.exit(1)
  }
  unlinkSync(linkPath)
}
symlinkSync(pluginRoot, linkPath, 'dir')
console.log(`linked     ${linkPath} -> ${pluginRoot}`)

/* ------------------------------------------------------------- bundles ---- */

if (alreadyListed) {
  console.log('bundles    already registered')
} else {
  copyFileSync(manifestPath, `${manifestPath}.bak-dracula`)
  const next = {
    ...manifest,
    dsh: {
      ...manifest.dsh,
      profile: {
        ...manifest.dsh?.profile,
        bundles: [...bundles, packageName],
      },
    },
  }
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`bundles    appended ${packageName} (backup: package.json.bak-dracula)`)
}
