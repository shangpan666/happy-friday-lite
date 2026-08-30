import { loadConfig } from '../../config.js'
import { runAgent } from '../agentRunner.js'
import { createLogger } from '../../agent/logger.js'
import { appendExternalMessage } from '../../externalChat.js'
import { WebSocket } from 'ws'

const log = createLogger('QQBot')

let ws = null
let connected = false
let mainWindowRef = null
let heartbeatTimer = null
let sessionSeq = null
let appToken = ''
let msgSeq = 0
const sessions = new Map()

export function setMainWindow(win) {
  mainWindowRef = win
}

function getCfg() {
  const b = (loadConfig().bridge || {}).qqbot || {}
  return {
    appid: String(b.appid || ''),
    secret: String(b.secret || ''),
    token: String(b.token || ''),
    apiBase: String(b.apiBase || 'https://api.bot.qq.com').replace(/\/$/, ''),
    gatewayUrl: String(b.gatewayUrl || '').trim(),
    sandbox: b.sandbox !== false
  }
}

function pushStatus() {
  try {
    mainWindowRef?.webContents?.send('bridge-qqbot-status', connected)
  } catch (_e) {
    // 忽略
  }
}

async function getAppAccessToken(cfg) {
  const res = await fetch(cfg.apiBase + '/app/getAppAccessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: cfg.appid, clientSecret: cfg.secret })
  })
  const data = await res.json().catch(() => ({}))
  if (!data.access_token) throw new Error('getAppAccessToken 失败: ' + JSON.stringify(data))
  appToken = data.access_token
  return appToken
}

async function getGateway(cfg) {
  const res = await fetch(cfg.apiBase + '/gateway/bot', {
    method: 'GET',
    headers: { 'Authorization': 'QQBot ' + appToken, 'X-Union-Appid': cfg.appid }
  })
  const data = await res.json().catch(() => ({}))
  if (!data.url) throw new Error('获取网关地址失败: ' + JSON.stringify(data))
  return data.url
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'QQBot ' + appToken,
    'X-Union-Appid': getCfg().appid
  }
}

function stripMention(text) {
  return String(text || '').replace(/^\s*@\S+\s*/, '').trim()
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
    // 持久化到桌面端会话，使对话出现在桌面「周五」
    appendExternalMessage(session, 'assistant', text, 'QQ 机器人对话', 'qqbot')
    await send(text)
  } catch (e) {
    log.error('QQBot 回复失败: ' + (e?.message || e))
    const errText = '（Friday 处理失败：' + (e?.message || e) + '）'
    try {
      appendExternalMessage(session, 'assistant', errText, 'QQ 机器人对话', 'qqbot')
    } catch (_e) {
      // 忽略
    }
  }
}

function buildSend(cfg, event) {
  return async (text) => {
    msgSeq = (msgSeq + 1) % 100000
    let url
    let body
    if (event.group_openid) {
      url = cfg.apiBase + '/v2/groups/' + event.group_openid + '/messages'
      body = { content: text, msg_type: 0, msg_id: event.id, msg_seq: msgSeq }
    } else if (event.author && event.author.user_openid) {
      const openid = event.author.user_openid
      url = cfg.apiBase + '/v2/users/' + openid + '/messages'
      body = { content: text, msg_type: 0, msg_id: event.id, msg_seq: msgSeq }
    } else {
      throw new Error('无法确定 QQBot 回复目标')
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error('QQBot 发送失败 ' + res.status + ': ' + txt)
    }
    return res.json().catch(() => ({}))
  }
}

function handleDispatch(cfg, event) {
  if (!event) return
  const isGroup = !!event.group_openid
  const isC2C = !isGroup && !!(event.author && event.author.user_openid)
  if (!isGroup && !isC2C) return
  const text = stripMention(event.content)
  if (!text) return
  const key = isGroup ? 'qqbot:g:' + event.group_openid : 'qqbot:c:' + event.author.user_openid
  pushHistory(key, 'user', text)
  // 持久化用户消息到桌面端会话
  appendExternalMessage(key, 'user', text, 'QQ 机器人对话', 'qqbot')
  replyTo(key, buildSend(cfg, event))
}

export async function startQQBot() {
  if (ws) return
  const cfg = getCfg()
  if (!cfg.appid || !cfg.secret) throw new Error('缺少 appid/secret')
  await getAppAccessToken(cfg)
  let gatewayUrl = cfg.gatewayUrl
  if (!gatewayUrl) gatewayUrl = await getGateway(cfg)
  connected = false
  ws = new WebSocket(gatewayUrl)
  ws.on('open', () => log.info('QQBot WS 已连接: ' + gatewayUrl))
  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch (_e) {
      return
    }
    if (msg.op === 10) {
      const interval = (msg.d && msg.d.heartbeat_interval) || 40000
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      heartbeatTimer = setInterval(() => {
        try { ws.send(JSON.stringify({ op: 1, d: sessionSeq })) } catch (_e) { /* 忽略 */ }
      }, interval)
      ws.send(JSON.stringify({
        op: 2,
        d: {
          token: 'QQBot ' + appToken,
          intents: 33554432 | 67108864,
          shard: [0, 1]
        }
      }))
      connected = true
      pushStatus()
    } else if (msg.op === 0) {
      sessionSeq = msg.s
      if (msg.t === 'GROUP_AT_MESSAGE_CREATE' || msg.t === 'C2C_MESSAGE_CREATE' || msg.t === 'AT_MESSAGE_CREATE') {
        handleDispatch(cfg, msg.d)
      }
    } else if (msg.op === 11) {
      // 心跳确认
    } else if (msg.op === 9) {
      log.error('QQBot 鉴权失败（appid/secret 不正确或被拒）')
      connected = false
      pushStatus()
    } else if (msg.op === 7) {
      log.info('QQBot 收到重连指令')
    }
  })
  ws.on('close', () => {
    connected = false
    ws = null
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    pushStatus()
  })
  ws.on('error', (e) => log.error('QQBot WS error: ' + (e?.message || e)))
}

export async function stopQQBot() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
  if (ws) { try { ws.close() } catch (_e) { /* 忽略 */ } ws = null }
  connected = false
  pushStatus()
}

export function isQQBotOnline() {
  return connected
}
