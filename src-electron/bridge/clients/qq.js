import { loadConfig } from '../../config.js'
import { runAgent } from '../agentRunner.js'
import { createLogger } from '../../agent/logger.js'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')
const log = createLogger('QQBridge')

let client = null
let clientDir = null
let qrcodeImage = null
let online = false
let mainWindowRef = null
const sessions = new Map()

export function isQQOnline() {
  return online
}

// 把 qrcode.png 读成 data: URL（data: 不受本地资源策略限制，渲染最稳妥）
function buildQrcodeUrl() {
  const candidates = []
  if (clientDir) candidates.push(join(clientDir, 'qrcode.png'))
  candidates.push(join(process.cwd(), 'data', '0', 'qrcode.png'))
  candidates.push(join(__dirname, '..', '..', '..', 'data', '0', 'qrcode.png'))
  for (const f of candidates) {
    try {
      if (existsSync(f)) {
        return 'data:image/png;base64,' + readFileSync(f).toString('base64')
      }
    } catch (_e) {
      // 忽略
    }
  }
  return null
}

export function setMainWindow(win) {
  mainWindowRef = win
}

function pushQrcode() {
  const url = buildQrcodeUrl()
  qrcodeImage = url
  try {
    mainWindowRef?.webContents?.send('bridge-qq-qr', url || null)
  } catch (_e) {
    // 忽略
  }
}

function pushHistory(session, role, content) {
  const cfg = loadConfig().bridge || {}
  const max = Number(cfg.maxHistory) || 40
  let hist = sessions.get(session) || []
  hist.push({ role, content })
  if (hist.length > max) hist = hist.slice(-max)
  sessions.set(session, hist)
  return hist
}

async function replyTo(session, send) {
  const cfg = loadConfig().bridge || {}
  const hist = sessions.get(session) || []
  try {
    const res = await runAgent({ messages: hist, unattended: cfg.unattended !== false })
    const text = (res && res.content) || ''
    if (!text) return
    pushHistory(session, 'assistant', text)
    await send(text)
  } catch (e) {
    log.error('QQ 回复失败: ' + (e?.message || e))
    try {
      await send('（Friday 处理失败：' + (e?.message || e) + '）')
    } catch (_e) {
      // 忽略二次失败
    }
  }
}

function handleMessage(e) {
  if (!e || e.post_type !== 'message') return
  const text = typeof e.raw_message === 'string' ? e.raw_message.trim() : ''
  if (!text) return
  const isGroup = e.message_type === 'group'
  const session = isGroup ? `qqg:${e.group_id}:${e.user_id}` : `qq:${e.user_id}`
  pushHistory(session, 'user', text)
  if (!client) return
  if (isGroup) replyTo(session, (t) => client.sendGroupMsg(e.group_id, t))
  else replyTo(session, (t) => client.sendPrivateMsg(e.user_id, t))
}

// 尝试用更新的 QQ 协议版本覆盖（icqq 内置最新仅 9.0.17，2024；2026 年服务端可能拒绝）。
// 若仍返回 retcode≠0，则确认是协议版本被服务端拒绝，需要换用维护中的外部网关。
const QQ_PROTO_VER = '9.1.15'
const QQ_PROTO_QUA = 'V1_AND_SQ_9.1.15_6470_YYB_D'
const QQ_PROTO_BUILD = '6470'

export async function startQQ() {
  if (client) return
  const { createClient } = await import('icqq')
  client = createClient(0)
  online = false
  clientDir = client.dir
  try {
    client.apk.ver = QQ_PROTO_VER
    client.apk.qua = QQ_PROTO_QUA
    client.apk.build = QQ_PROTO_BUILD
  } catch (_e) {
    // 忽略
  }
  client.on('internal.error.qrcode', (code, msg) => {
    log.error('icqq 获取二维码失败 retcode=' + code + ' msg=' + msg)
  })
  client.on('system.login.qrcode', (ev) => {
    // oicq 会把二维码写到 client.dir/qrcode.png，直接读该文件最稳；
    // 同时把 file:// URL 通过事件推给前端（不依赖前端轮询）。
    pushQrcode()
    log.info('QQ 登录二维码已生成')
  })
  client.on('system.online', () => {
    online = true
    qrcodeImage = null
    try {
      mainWindowRef?.webContents?.send('bridge-qq-qr', null)
    } catch (_e) {
      // 忽略
    }
    log.info('QQ 桥接已上线')
  })
  client.on('message', handleMessage)
  client.on('system.login.error', (e) => {
    online = false
    log.error('QQ 登录错误: code=' + (e?.code ?? '?') + ' msg=' + (e?.message || JSON.stringify(e)))
  })
  client.on('error', (err) => log.error('QQ error: ' + (err?.message || err)))
  // 不 await：二维码登录需等用户扫码，login() 会长时间不 resolve；
  // 交由前端轮询 bridge-qq-qr 获取二维码，扫码后由 system.online 上线。
  client.login().catch((e) => log.error('QQ 登录失败: ' + (e?.message || e)))
}

export function isQQRunning() {
  return !!client
}

export function getQQQrcode() {
  if (qrcodeImage) return qrcodeImage
  const url = buildQrcodeUrl()
  if (url) {
    qrcodeImage = url
    return url
  }
  console.log('[QQBridge][getQQQrcode] 未找到二维码文件，clientDir=' + clientDir +
    ' cwd=' + process.cwd())
  return null
}

export async function stopQQ() {
  if (client) {
    try {
      client.logout && (await client.logout())
    } catch (_e) {
      // 忽略
    }
    try {
      client.terminate && client.terminate()
    } catch (_e) {
      // 忽略
    }
    client = null
  }
  online = false
  qrcodeImage = null
  sessions.clear()
}
