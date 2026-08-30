/**
 * 内置工具：对话（聊天记录）操作
 * ================================
 * 让 Friday 智能体（含 QQ / QQ 机器人 / 手机等外部入口）能够读取桌面端的
 * 历史对话，从而实现"完全操作桌面端"——例如被问到"之前的对话"时，
 * 不再只能说"我只能看笔记"，而是可以检索并引用真实聊天记录。
 *
 * 读操作，无需审批。
 */

import { z } from 'zod'
import { registerTool } from '../registry.js'

// ========== list_chat_sessions ==========

const listSessionsSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().describe('返回最近会话数量，默认 10')
})

async function listSessionsHandler(args, ctx) {
  const limit = Math.min(Math.max(args.limit || 10, 1), 50)
  const { getSessions } = await import('../../../db.js')
  const sessions = getSessions().slice(0, limit)
  if (!sessions.length) return '当前没有任何对话记录。'
  return sessions
    .map((s, i) => {
      const t = s.updatedAt ? new Date(s.updatedAt).toLocaleString('zh-CN') : ''
      return `${i + 1}. 【${s.id}】${s.title || '未命名对话'}（${s.mode || 'chat'}）更新于 ${t}`
    })
    .join('\n')
}

registerTool({
  name: 'list_chat_sessions',
  description: '列出桌面端最近的对话会话（按更新时间倒序）。用于了解有哪些历史对话可查看。',
  schema: listSessionsSchema,
  handler: listSessionsHandler,
  meta: { requireApproval: false, exposedViaMcp: true }
})

// ========== get_chat_session ==========

const getSessionSchema = z.object({
  sessionId: z.string().describe('会话 ID（来自 list_chat_sessions 或 search_chat_history）')
})

async function getSessionHandler(args, ctx) {
  const { sessionId } = args
  const { getSession, getMessages } = await import('../../../db.js')
  const session = getSession(sessionId)
  if (!session) return `未找到会话: ${sessionId}`
  const messages = getMessages(sessionId)
  if (!messages.length) return `会话【${session.title || sessionId}】暂无消息。`
  const text = messages
    .map(m => {
      const role = m.role === 'user' ? '用户' : '周五'
      const c = (m.content || '').slice(0, 4000)
      return `【${role}】${c}`
    })
    .join('\n\n')
  return `会话【${session.title || sessionId}】内容如下：\n\n${text}`
}

registerTool({
  name: 'get_chat_session',
  description: '获取某个会话的完整消息记录（用户与周五的多轮对话）。',
  schema: getSessionSchema,
  handler: getSessionHandler,
  meta: { requireApproval: false, exposedViaMcp: true }
})

// ========== search_chat_history ==========

const searchHistorySchema = z.object({
  query: z.string().describe('要检索的关键词，会在对话标题与消息正文中匹配'),
  limit: z.number().int().min(1).max(20).optional().describe('返回匹配会话数量，默认 5')
})

async function searchHistoryHandler(args, ctx) {
  const query = (args.query || '').trim()
  if (!query) return '请提供检索关键词。'
  const limit = Math.min(Math.max(args.limit || 5, 1), 20)
  const { getSessions, getMessages } = await import('../../../db.js')

  const tokens = query.split(/[\s,，、]+/).map(t => t.trim()).filter(Boolean)
  const matchText = (text) => {
    const lower = (text || '').toLowerCase()
    return tokens.some(tok => lower.includes(tok.toLowerCase()))
  }

  const sessions = getSessions()
  const hits = []
  for (const s of sessions) {
    if (hits.length >= limit) break
    const titleHit = matchText(s.title)
    let snippet = ''
    let matched = titleHit
    if (!titleHit) {
      const messages = getMessages(s.id)
      for (const m of messages) {
        if (matchText(m.content)) {
          snippet = (m.content || '').slice(0, 240)
          matched = true
          break
        }
      }
    } else {
      const messages = getMessages(s.id)
      const first = messages.find(m => matchText(m.content))
      snippet = first ? (first.content || '').slice(0, 240) : (s.preview || '').slice(0, 240)
    }
    if (matched) {
      hits.push(`【${s.id}】${s.title || '未命名对话'}\n${snippet ? snippet + '...' : ''}`.trim())
    }
  }

  if (!hits.length) return `未在对话记录中找到包含"${query}"的内容。`
  return `找到以下相关对话：\n\n` + hits.join('\n\n')
}

registerTool({
  name: 'search_chat_history',
  description: '在桌面端的全部历史对话中按关键词检索，返回匹配的会话 ID 与内容片段。',
  schema: searchHistorySchema,
  handler: searchHistoryHandler,
  meta: { requireApproval: false, exposedViaMcp: true }
})
