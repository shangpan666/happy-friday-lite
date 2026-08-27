#!/usr/bin/env node
/**
 * 桥接（微信 / QQ 直接连接）就绪性检查脚本
 * 仅做只读检查，不修改任何文件。
 * 用法：node scripts/check-bridge.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = process.cwd()
const log = (s) => process.stdout.write(s + '\n')

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  log(`${ok ? '✓' : '✗'} ${name}${detail ? '  — ' + detail : ''}`)
}

// ---------- 1. package.json 依赖声明 ----------
let pkg = {}
try {
  pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
} catch (e) {
  check('读取 package.json', false, e.message)
  finish()
}
const opt = pkg.optionalDependencies || {}
const dep = pkg.dependencies || {}
check('wechatferry 在 optionalDependencies 且版本号存在', !!opt.wechatferry, opt.wechatferry || '缺失')
check('icqq 在 optionalDependencies 且版本号存在', !!opt.icqq, opt.icqq || '缺失')
check('landlock linux addon 已移出 dependencies', !dep['@deepseek-ai/node-addon-landlock-run-linux-x64'],
  dep['@deepseek-ai/node-addon-landlock-run-linux-x64'] ? '仍在 dependencies（会导致 windows 装包失败）' : '已移入 optionalDependencies')

// ---------- 2. node_modules 实际安装 ----------
const mods = ['wechatferry', 'icqq', '@wechatferry/agent', '@wechatferry/core']
for (const m of mods) {
  check(`node_modules/${m} 已安装`, existsSync(join(root, 'node_modules', m)),
    existsSync(join(root, 'node_modules', m)) ? '' : '未安装，请运行 npm install')
}

// ---------- 3. 语法检查（node --check）----------
const files = [
  'src-electron/bridge/clients/wechat.js',
  'src-electron/bridge/clients/qq.js',
  'src-electron/bridge/index.js',
  'src-electron/commands.js'
]
for (const f of files) {
  const p = join(root, f)
  if (!existsSync(p)) { check(`语法 ${f}`, false, '文件不存在'); continue }
  try {
    execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' })
    check(`语法 ${f}`, true)
  } catch (e) {
    check(`语法 ${f}`, false, String(e.stderr || e.message).split('\n')[0])
  }
}

// ---------- 4. 动态 import 验证导出 ----------
try {
  const wf = await import('wechatferry/agent')
  check('wechatferry/agent 可加载且导出 WechatferryAgent', typeof wf.WechatferryAgent === 'function')
} catch (e) {
  check('wechatferry/agent 可加载', false, e.message)
}
try {
  const oq = await import('icqq')
  check('icqq 可加载且导出 createClient', typeof oq.createClient === 'function')
} catch (e) {
  check('icqq 可加载', false, e.message)
}

// ---------- 5. IPC 通道注册 ----------
try {
  const preload = readFileSync(join(root, 'preload.cjs'), 'utf8')
  const ch = ['bridge-wechat-start', 'bridge-wechat-stop', 'bridge-qq-start', 'bridge-qq-stop', 'bridge-qq-qr', 'bridge-napcat-start', 'bridge-napcat-stop', 'bridge-qqbot-start', 'bridge-qqbot-stop']
  const missing = ch.filter((c) => !preload.includes(`'${c}'`))
  check('preload.cjs 已注册新 IPC 通道', missing.length === 0, missing.length ? '缺失: ' + missing.join(', ') : ch.length + ' 个全部注册')
} catch (e) {
  check('读取 preload.cjs', false, e.message)
}
try {
  const cmds = readFileSync(join(root, 'src-electron/commands.js'), 'utf8')
  const h = ['bridge-wechat-start', 'bridge-wechat-stop', 'bridge-qq-start', 'bridge-qq-stop', 'bridge-qq-qr', 'bridge-napcat-start', 'bridge-napcat-stop', 'bridge-qqbot-start', 'bridge-qqbot-stop']
  const missing = h.filter((c) => !cmds.includes(`ipcMain.handle('${c}'`))
  check('commands.js 已注册新 IPC 处理器', missing.length === 0, missing.length ? '缺失: ' + missing.join(', ') : h.length + ' 个全部注册')
} catch (e) {
  check('读取 commands.js', false, e.message)
}

// ---------- 6. 设置页 UI 接线 ----------
try {
  const vue = readFileSync(join(root, 'src/views/settings/SettingsGeneral.vue'), 'utf8')
  const keys = ['directWechat', 'directQQ', 'directConnect', 'directDisconnect', 'startWechat', 'startQQ', 'qqQrcode']
  const missing = keys.filter((k) => !vue.includes(k))
  check('SettingsGeneral.vue 已接入直接连接 UI', missing.length === 0, missing.length ? '缺失引用: ' + missing.join(', ') : '关键引用齐全')
} catch (e) {
  check('读取 SettingsGeneral.vue', false, e.message)
}

// ---------- 7. i18n 键 ----------
try {
  const zh = JSON.parse(readFileSync(join(root, 'src/i18n/locales/zh-CN/settings.json'), 'utf8'))
  const en = JSON.parse(readFileSync(join(root, 'src/i18n/locales/en-US/settings.json'), 'utf8'))
  const k = ['direct', 'directWechat', 'directQQ', 'directConnect', 'directDisconnected', 'directQQScan']
  const mz = k.filter((x) => !zh[x])
  const me = k.filter((x) => !en[x])
  check('i18n(zh-CN) direct 键齐全', mz.length === 0, mz.length ? '缺: ' + mz.join(', ') : '齐全')
  check('i18n(en-US) direct 键齐全', me.length === 0, me.length ? '缺: ' + me.join(', ') : '齐全')
} catch (e) {
  check('读取 i18n', false, e.message)
}

finish()

function finish() {
  const fail = results.filter((r) => !r.ok)
  log('')
  log(`========== 汇总：通过 ${results.length - fail.length}/${results.length} 项 ==========`)
  if (fail.length === 0) {
    log('依赖与代码侧均已就绪。')
    log('运行时请确认：')
    log('  1) 彻底退出并重启 Friday（主进程文件只在启动时加载，刷新页面无效）；')
    log('  2) 微信需 3.9.12.17 且已登录、Friday 以管理员运行；')
    log('  3) QQ 点连接后约 1.5s 弹二维码，若直接“已连接”是复用了缓存登录；')
    log('     若卡住不弹码，删除项目根目录 data/ 文件夹后重连。')
  } else {
    log('以下项未通过，请先处理：')
    fail.forEach((r) => log('  ✗ ' + r.name + (r.detail ? '  — ' + r.detail : '')))
  }
  process.exit(fail.length ? 1 : 0)
}
