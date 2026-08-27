/**
 * OpenAI 兼容 HTTP 服务
 * ======================
 * 把 Friday 智能体包装成 OpenAI 兼容的 /v1/chat/completions 端点，
 * 供外部聊天平台作为「模型后端」接入：
 *   - QQ：LangBot 的 OpenAI 兼容平台，指向本端点
 *   - 微信：OpenClaw 网关 + 官方 openclaw-weixin 插件，把模型 provider 指向本端点
 *
 * 支持流式（SSE）与非流式两种响应，兼容 OpenAI 请求/响应格式。
 * 会话连续性：以请求头 x-session-id 或 body.user 作为会话键，在服务端维护滑动历史窗口。
 */

import http from 'http'
import { runAgent } from './agentRunner.js'
import { loadConfig } from '../config.js'
import { createLogger } from '../agent/logger.js'

const log = createLogger('BridgeHTTP')

// 会话键 -> { messages: [{role, content}], updatedAt }
const sessions = new Map()

function getSession(key) {
  let s = sessions.get(key)
  if (!s) {
    s = { messages: [], updatedAt: Date.now() }
    sessions.set(key, s)
  }
  return s
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function extractText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'string' ? c : c?.text || '')).join('')
  return ''
}

function setCors(req, res, bridge) {
  const origin = req.headers.origin
  const allow = bridge.allowedOrigins || '*'
  if (allow === '*' || (origin && allow.split(',').map((s) => s.trim()).includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id')
}

function checkAuth(req, bridge) {
  const apiKey = bridge.apiKey
  if (!apiKey) return true
  const auth = req.headers['authorization'] || ''
  return auth === `Bearer ${apiKey}` || auth === apiKey
}

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}

/**
 * 启动 OpenAI 兼容服务
 * @returns {http.Server|null} 已启动的 server，或未启用时返回 null
 */
export function startOpenAIServer() {
  const baseConfig = loadConfig()
  const bridge = baseConfig.bridge || {}

  const forced = process.env.FRIDAY_BRIDGE === '1'
  if (!bridge.enabled && !forced) {
    log.info('Bridge 未启用（config.bridge.enabled=false 且未设置 FRIDAY_BRIDGE=1）')
    return null
  }

  const host = process.env.FRIDAY_BRIDGE_HOST || bridge.host || '127.0.0.1'
  const port = Number(process.env.FRIDAY_BRIDGE_PORT || bridge.port || 18790)

  const server = http.createServer(async (req, res) => {
    // 每次请求重新读取配置（模型列表、apiKey 可能已变更）
    const config = loadConfig()
    const b = config.bridge || {}
    setCors(req, res, b)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    let url
    try {
      url = new URL(req.url, `http://${req.headers.host}`)
    } catch (_e) {
      sendJSON(res, 400, { error: { message: 'Bad Request' } })
      return
    }

    const pathname = url.pathname

    if (pathname === '/healthz') {
      sendJSON(res, 200, { ok: true })
      return
    }

    if (pathname === '/v1/models' && req.method === 'GET') {
      const models = (config.customModels || []).map((m) => ({
        id: m.modelName || m.id,
        object: 'model',
        owned_by: 'friday'
      }))
      sendJSON(res, 200, { object: 'list', data: models })
      return
    }

    if (pathname === '/v1/chat/completions' && req.method === 'POST') {
      if (!checkAuth(req, b)) {
        sendJSON(res, 401, { error: { message: 'Unauthorized' } })
        return
      }

      let body
      try {
        body = JSON.parse(await readBody(req))
      } catch (_e) {
        sendJSON(res, 400, { error: { message: 'Invalid JSON body' } })
        return
      }

      const sessionKey = req.headers['x-session-id'] || (typeof body.user === 'string' ? body.user : 'default')
      const session = getSession(sessionKey)

      // 将本次请求的 messages 合并进会话滑动窗口
      const incoming = Array.isArray(body.messages) ? body.messages : []
      for (const m of incoming) {
        if (!m || !m.role) continue
        const text = extractText(m.content)
        const last = session.messages[session.messages.length - 1]
        if (last && last.role === m.role && last.content === text) continue
        session.messages.push({ role: m.role, content: text })
      }
      const max = Number(b.maxHistory) || 40
      if (session.messages.length > max) {
        session.messages = session.messages.slice(-max)
      }
      session.updatedAt = Date.now()

      const stream = !!body.stream
      const model = body.model
      const id = 'chatcmpl-' + Math.random().toString(36).slice(2)
      const created = Math.floor(Date.now() / 1000)
      const replyModel = model || 'friday'
      const unattended = b.unattended !== false

      if (!stream) {
        try {
          const { content } = await runAgent({ messages: session.messages, model, unattended })
          session.messages.push({ role: 'assistant', content })
          sendJSON(res, 200, {
            id,
            object: 'chat.completion',
            created,
            model: replyModel,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content },
                finish_reason: 'stop'
              }
            ],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          })
        } catch (e) {
          log.error(`chat/completions 失败: ${e.message}`)
          sendJSON(res, 500, { error: { message: e.message || String(e) } })
        }
        return
      }

      // 流式（SSE）
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })
      res.write('')

      let full = ''
      const writeChunk = (delta) => {
        const chunk = {
          id,
          object: 'chat.completion.chunk',
          created,
          model: replyModel,
          choices: [{ index: 0, delta, finish_reason: null }]
        }
        res.write('data: ' + JSON.stringify(chunk) + '\n\n')
      }

      try {
        await runAgent({
          messages: session.messages,
          model,
          unattended,
          onToken: (t) => {
            full += t
            writeChunk({ content: t })
          }
        })
        session.messages.push({ role: 'assistant', content: full })
      } catch (e) {
        log.error(`chat/completions(stream) 失败: ${e.message}`)
        full += '⚠ 出错了：' + (e.message || e)
        writeChunk({ content: '⚠ 出错了：' + (e.message || e) })
      }

      writeChunk({})
      res.write('data: ' + JSON.stringify({
        id,
        object: 'chat.completion.chunk',
        created,
        model: replyModel,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
      }) + '\n\n')
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    sendJSON(res, 404, { error: { message: 'Not Found' } })
  })

  server.listen(port, host, () => {
    log.info(`✅ Bridge（OpenAI 兼容）服务已启动: http://${host}:${port}`)
    log.info(`   端点: POST /v1/chat/completions  GET /v1/models  GET /healthz`)
  })

  return server
}
