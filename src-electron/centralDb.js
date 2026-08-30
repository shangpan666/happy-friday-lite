import * as db from './db.js'

// 中央机连接状态：由渲染层通过 set_connection IPC 下发
let connection = { serverUrl: '', token: '' }

export function setConnection(serverUrl, token) {
  connection = {
    serverUrl: (serverUrl || '').trim().replace(/\/+$/, ''),
    token: token || ''
  }
}

export function clearConnection() {
  connection = { serverUrl: '', token: '' }
}

export function isCentral() {
  return !!(connection.serverUrl && connection.token)
}

async function api(path, method = 'GET', body) {
  const res = await fetch(`${connection.serverUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${connection.token}`
    },
    body: body ? JSON.stringify(body) : undefined
  })
  let data = {}
  try {
    data = await res.json()
  } catch (_e) {
    // 忽略解析错误
  }
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `中央机请求失败 (${res.status})`)
  }
  return data
}

// 以下函数：未连接中央机时走本地 db（同步返回），连接中央机时走 HTTP（返回 Promise）。
// 函数本身不声明 async，以便本地分支保持同步语义，中央分支返回 Promise。

// ===== 笔记 =====
export function getNotes(knowledgeBaseId, notebookId) {
  if (!isCentral()) return db.getNotes(knowledgeBaseId, notebookId)
  return api('/api/mobile/notes').then((d) => d.notes || [])
}

export function getNote(noteId) {
  if (!isCentral()) return db.getNote(noteId)
  return api(`/api/mobile/note/${encodeURIComponent(noteId)}`).then((d) => d.note || null)
}

export function createNote(knowledgeBaseId, notebookId, title) {
  if (!isCentral()) return db.createNote(knowledgeBaseId, notebookId, title)
  return api('/api/mobile/notes', 'POST', { title }).then((d) => d.note)
}

export function importNote(knowledgeBaseId, notebookId, title, content, contentText) {
  if (!isCentral()) return db.importNote(knowledgeBaseId, notebookId, title, content, contentText)
  return api('/api/mobile/notes', 'POST', { title, content, contentText }).then((d) => d.note)
}

export function updateNote(noteId, title, content, contentText, notebookId) {
  if (!isCentral()) return db.updateNote(noteId, title, content, contentText, notebookId)
  return api(`/api/mobile/note/${encodeURIComponent(noteId)}`, 'PUT', { title, content, contentText }).then((d) => d.note)
}

export function softDeleteNote(noteId) {
  if (!isCentral()) return db.softDeleteNote(noteId)
  return api(`/api/mobile/note/${encodeURIComponent(noteId)}`, 'DELETE').then(() => true)
}

export function searchNotes(query) {
  if (!isCentral()) return db.searchNotes(query)
  return api(`/api/mobile/notes/search?q=${encodeURIComponent(query || '')}`).then((d) => d.notes || [])
}

// ===== 知识库（只读共享：仅在连接中央机时由 kb-remote-* IPC 调用，走服务端只读接口）=====
export function getKnowledgeTree() {
  return api('/api/mobile/kb/tree').then((d) => d || { categories: [], readOnly: true })
}

export function readKnowledgeDir(relPath) {
  return api(`/api/mobile/kb/read-dir?p=${encodeURIComponent(relPath || '')}`).then((d) => d || { entries: [] })
}

export function readKnowledgeFile(relPath) {
  return api(`/api/mobile/kb/file?p=${encodeURIComponent(relPath)}`).then((d) => d || { success: false })
}

// ===== 会话/对话 =====
export function getSessions() {
  if (!isCentral()) return db.getSessions()
  return api('/api/mobile/sessions').then((d) => d.sessions || [])
}

export function getSession(sessionId) {
  if (!isCentral()) return db.getSession(sessionId)
  return api(`/api/mobile/session/${encodeURIComponent(sessionId)}`).then((d) => d.session || null)
}

export function createSession(title, mode, accountId) {
  if (!isCentral()) return db.createSession(title, mode, accountId)
  return api('/api/mobile/sessions', 'POST', { title }).then((d) => d.session)
}

export function updateSessionTitle(sessionId, title) {
  if (!isCentral()) return db.updateSessionTitle(sessionId, title)
  return api(`/api/mobile/session/${encodeURIComponent(sessionId)}`, 'PUT', { title }).then((d) => d.session)
}

export function deleteSession(sessionId) {
  if (!isCentral()) return db.deleteSession(sessionId)
  return api(`/api/mobile/session/${encodeURIComponent(sessionId)}`, 'DELETE').then(() => ({ automationRunsDeleted: 0 }))
}

export function getMessages(sessionId) {
  if (!isCentral()) return db.getMessages(sessionId)
  return api(`/api/mobile/session/${encodeURIComponent(sessionId)}/messages`).then((d) => d.messages || [])
}

export function saveMessage(sessionId, role, content, extra) {
  if (!isCentral()) return db.saveMessage(sessionId, role, content, extra)
  return api(`/api/mobile/session/${encodeURIComponent(sessionId)}/messages`, 'POST', { role, content }).then(
    (d) => d.note || d.message || { id: `central-${Date.now()}`, sessionId, role, content }
  )
}

export function rollbackSession(sessionId, messageId) {
  if (!isCentral()) return db.rollbackSession(sessionId, messageId)
  // 中央机暂不支持回滚
  return null
}

export function updateSessionTimestamp(sessionId) {
  if (!isCentral()) return db.updateSessionTimestamp(sessionId)
  // 中央机写入时自动更新时间戳
  return null
}
