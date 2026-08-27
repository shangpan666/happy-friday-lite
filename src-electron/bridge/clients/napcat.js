import { loadConfig } from '../../config.js'
import { runAgent } from '../agentRunner.js'
import { createLogger } from '../../agent/logger.js'
import { WebSocket } from 'ws'

const log = createLogger('NapCat')

let ws = null
let connected = false
let mainWindowRef = null
let echoSeq = 0
const pending = new Map()
const sessions = new Map()

export function setMainWindow(win) {
  mainWindowRef = win
}

function pushStatus() {
  try {
    mainWindowRef?.webContents?.send('bridge-napcat-status', connected)
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
    log.error('NapCat 回复失败: ' + (e?.message || e))
    try {
      await send('（Friday 处理失败：' + (e?.message || e) + '）')
    } catch (_e) {
      // 忽略二次失败
    }
  }
}

function handleMessage(data) {
  const text = typeof data.raw_message === 'string' ? data.raw_message.trim() : ''
  if (!text) return
  const isGroup = data.message_type === 'group'
  const userId = data.user_id
  const groupId = data.group_id
  const session = isGroup ? `qqg:${groupId}:${userId}` : `qq:${userId}`
  pushHistory(session, 'user', text)
  const send = (t) => sendMsg({ messageType: data.message_type, userId, groupId, text: t })
  replyTo(session, send)
}

function sendMsg({ messageType, userId, groupId, text }) {
  const action = messageType === 'group' ? 'send_group_msg' : 'send_private_msg'
  const params = messageType === 'group'
    ? { group_id: groupId, message: text }
    : { user_id: userId, message: text }
  return callAction(action, params)
}

function callAction(action, params, timeout = 30000) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('NapCat 未连接'))
      return
    }
    const echo = ++echoSeq
    const timer = setTimeout(() => {
      if (pending.has(echo)) {
        pending.delete(echo)
        reject(new Error('NapCat 动作超时: ' + action))
      }
    }, timeout)
    pending.set(echo, {
      resolve: (v) => { clearTimeout(timer); resolve(v) },
      reject: (e) => { clearTimeout(timer); reject(e) }
    })
    ws.send(JSON.stringify({ action, params, echo }))
  })
}

export async function startNapCat() {
  if (ws) return
  const cfg = (loadConfig().bridge || {}).napcat || {}
  const url = cfg.url || 'ws://127.0.0.1:3001/onebot/v11/ws'
  const token = cfg.token || ''
  const fullUrl = token
    ? url + (url.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(token)
    : url
  connected = false
  ws = new WebSocket(fullUrl)
  ws.on('open', () => {
    connected = true
    log.info('NapCat 已连接: ' + fullUrl)
    pushStatus()
  })
  ws.on('message', (raw) => {
    let data
    try {
      data = JSON.parse(raw.toString())
    } catch (_e) {
      return
    }
    if (data.echo !== undefined && pending.has(data.echo)) {
      const p = pending.get(data.echo)
      pending.delete(data.echo)
      if (data.status === 'ok' || data.status === 'success') p.resolve(data.data)
      else p.reject(new Error(data.message || 'NapCat 动作失败'))
      return
    }
    if (data.post_type === 'message') handleMessage(data)
  })
  ws.on('close', () => {
    connected = false
    ws = null
    log.info('NapCat 已断开')
    pushStatus()
  })
  ws.on('error', (e) => log.error('NapCat error: ' + (e?.message || e)))
}

export async function stopNapCat() {
  if (ws) {
    try { ws.close() } catch (_e) { /* 忽略 */ }
    ws = null
  }
  connected = false
  pending.clear()
  pushStatus()
}

export function isNapCatOnline() {
  return connected
}
