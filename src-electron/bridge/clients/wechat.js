import { loadConfig } from '../../config.js'
import { runAgent } from '../agentRunner.js'
import { createLogger } from '../../agent/logger.js'

const log = createLogger('WechatBridge')

let agent = null
const sessions = new Map()

const SYS_TYPES = [9999, 10000, 10002]

function pushHistory(session, role, content) {
  const cfg = loadConfig().bridge || {}
  const max = Number(cfg.maxHistory) || 40
  let hist = sessions.get(session) || []
  hist.push({ role, content })
  if (hist.length > max) hist = hist.slice(-max)
  sessions.set(session, hist)
  return hist
}

async function replyTo(session, isGroup, convId, mention) {
  const cfg = loadConfig().bridge || {}
  const hist = sessions.get(session) || []
  try {
    const res = await runAgent({ messages: hist, unattended: cfg.unattended !== false })
    const text = (res && res.content) || ''
    if (!text) return
    pushHistory(session, 'assistant', text)
    if (!agent) return
    if (isGroup) agent.sendText(convId, text, [mention])
    else agent.sendText(convId, text)
  } catch (e) {
    log.error('WeChat 回复失败: ' + (e?.message || e))
    if (agent) {
      const tip = '（Friday 处理失败：' + (e?.message || e) + '）'
      try {
        agent.sendText(convId, tip, isGroup ? [mention] : undefined)
      } catch (_e) {
        // 忽略
      }
    }
  }
}

function handleMessage(m) {
  if (!m || m.is_self) return
  const content = typeof m.content === 'string' ? m.content.trim() : ''
  if (!content) return
  if (SYS_TYPES.includes(m.type)) return
  const isGroup = !!m.is_group
  const session = isGroup ? `wxg:${m.roomid}:${m.sender}` : `wx:${m.sender}`
  pushHistory(session, 'user', content)
  const convId = isGroup ? m.roomid : m.sender
  replyTo(session, isGroup, convId, m.sender)
}

export async function startWechat() {
  if (agent) return
  const { WechatferryAgent } = await import('wechatferry/agent')
  agent = new WechatferryAgent()
  agent.on('message', handleMessage)
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('等待微信登录超时：请确认已安装并登录「微信 3.9.12.17」，并用管理员身份运行 Friday'))
    }, 15000)
    agent.on('login', (u) => {
      clearTimeout(timer)
      log.info('WeChat 已登录: ' + (u && (u.wxid || u.nickName || '')))
      resolve()
    })
    agent.on('error', (e) => {
      clearTimeout(timer)
      reject(new Error('WeChatFerry 错误：' + (e?.message || e)))
    })
  })
  try {
    agent.start()
  } catch (e) {
    agent = null
    throw new Error('WeChatFerry 启动失败（请确认已安装并登录微信 3.9.12.17，且以管理员运行）：' + (e?.message || e))
  }
  await ready
  log.info('WeChatFerry 桥接已启动')
}

export function isWechatRunning() {
  return !!agent
}

export async function stopWechat() {
  if (agent) {
    try {
      agent.stop()
    } catch (_e) {
      // 忽略
    }
    agent = null
  }
  sessions.clear()
}
