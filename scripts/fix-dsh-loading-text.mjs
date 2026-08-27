// Translate the DSH boot/loading page strings into Chinese. The boot page is
// rendered by dsh-client-web (SSR) and mirrored in the minified web frontend
// bundle, so the raw string literals are replaced regardless of surrounding
// code style. The patch is idempotent and runs after every dependency install.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const replacements = [
  ['"Loading plugins\u2026"', '"\u6B63\u5728\u52A0\u8F7D\u63D2\u4EF6\u2026"'],
  ['"Failed to load plugins"', '"\u63D2\u4EF6\u52A0\u8F7D\u5931\u8D25"'],
  ['children:"HARNESS"', 'children:"Phronesis"'],
  ['children: "HARNESS"', 'children: "Phronesis"']
]

const targets = []
const clientWeb = join(root, '..', 'node_modules', '@deepseek-ai', 'dsh-client-web', 'lib', 'index.js')
if (existsSync(clientWeb)) targets.push(clientWeb)

const frontendAssets = join(root, '..', 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist', 'assets')
if (existsSync(frontendAssets)) {
  for (const name of readdirSync(frontendAssets)) {
    if (name.endsWith('.js')) targets.push(join(frontendAssets, name))
  }
}

const checkOnly = process.argv.includes('--check')
let patched = 0

for (const file of targets) {
  let source = readFileSync(file, 'utf8')
  let changed = false
  for (const [original, replacement] of replacements) {
    if (source.includes(replacement)) continue
    if (!source.includes(original)) continue
    source = source.split(original).join(replacement)
    changed = true
  }
  if (changed) {
    if (checkOnly) {
      throw new Error(`[fix-dsh-loading-text] ${file} still has English boot strings`)
    }
    writeFileSync(file, source)
    patched++
  }
}

console.log(`[fix-dsh-loading-text] translated boot page strings in ${patched} file(s)`)
