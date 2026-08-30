// 把外部入口（QQ / QQ 机器人 / 手机等）产生的对话持久化到桌面端数据库，
// 使这些对话自动出现在桌面「周五」的会话列表中（即"在桌面端发起对话"）。
// 通过 externalKey 复用同一个桌面会话，保证同一联系人的上下文连续。

import * as db from './db.js'
import { notifyExternalSession } from './externalNotify.js'

// externalKey -> 桌面端 sessionId
const sessionMap = new Map()

export function getOrCreateExternalSession(externalKey, defaultTitle) {
  let sid = sessionMap.get(externalKey)
  if (sid) {
    const s = db.getSession(sid)
    if (s) return sid
  }
  const s = db.createSession(defaultTitle || '外部对话', 'chat')
  sid = s.id
  sessionMap.set(externalKey, sid)
  return sid
}

/**
 * 追加一条外部消息到桌面会话，并通知渲染进程刷新
 * @param {string} externalKey 外部会话唯一键
 * @param {'user'|'assistant'} role 角色
 * @param {string} content 内容
 * @param {string} defaultTitle 新建会话时的默认标题
 * @param {string} source 来源标识（qq / qqbot / wechat / mobile ...）
 * @returns {string} 桌面端 sessionId
 */
export function appendExternalMessage(externalKey, role, content, defaultTitle, source) {
  const sid = getOrCreateExternalSession(externalKey, defaultTitle)
  db.saveMessage(sid, role, content)
  if (role === 'user') {
    db.updateSessionTitle(sid, String(content || '').slice(0, 30))
  }
  notifyExternalSession(sid, source)
  return sid
}
