import http from 'http'
import os from 'os'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import * as db from './db.js'
import {
  authenticate,
  issueToken,
  getAccountByToken,
  getAccountByUsername,
  createAccount,
  bootstrapAuth,
  getDeviceId,
  changePassword
} from './db.js'
import { loadConfig, saveConfig, getDataDir } from './config.js'
import { runAgent } from './bridge/agentRunner.js'
import { notifyExternalSession } from './externalNotify.js'
import {
  startHarnessSidecar,
  stopHarnessSidecar,
  restartHarnessSidecar,
  getHarnessPublicStatus,
  getHarnessPublicStatusWithDiag
} from './harness/index.js'

// 内网分享服务：在主进程启动一个 HTTP 服务，局域网内可通过浏览器访问
// 复用前端构建产物（dist/），直接加载已有的对话界面（隐藏输入框）。
// 仅暴露 GET /api/share/:sessionId 数据接口 + 静态文件服务，无任何写操作

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// dist 目录位于项目根目录（src-electron 的上一级）
const DIST_DIR = path.join(__dirname, '..', 'dist')

let server = null
let serverPort = null
const PREFERRED_PORT = 17918

// 获取本机内网 IPv4 地址（非回环）
export function getLocalIp() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
}

function getMime(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

// 提供前端构建产物的静态文件服务（SPA：未命中的路径回退到 index.html）
function serveStatic(res, urlPath) {
  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Share service unavailable: app not built yet.')
    return
  }

  // 规范化并防止路径穿越
  const resolved = path.normalize(path.join(DIST_DIR, urlPath))
  if (resolved !== DIST_DIR && !resolved.startsWith(DIST_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  let filePath = resolved
  try {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      // SPA 回退：未命中的路径交给前端路由处理
      filePath = path.join(DIST_DIR, 'index.html')
    }
    const data = fs.readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': getMime(filePath) })
    res.end(data)
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not Found')
  }
}

// 分享数据接口：返回会话信息和消息列表
function serveShareApi(res, sessionId) {
  try {
    const session = db.getSession(sessionId)
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: false, error: 'Session not found' }))
      return
    }
    const messages = db.getMessages(sessionId)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, session, messages }))
  } catch (e) {
    // 数据库未就绪或查询异常时返回 404，避免暴露内部错误
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Session not found' }))
  }
}

// 笔记分享数据接口：返回笔记内容（只读查看）
function serveNoteShareApi(res, noteId) {
  try {
    const note = db.getNote(noteId)
    if (!note) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: false, error: 'Note not found' }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, note }))
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Note not found' }))
  }
}

// ===== 笔记只读共享：管理员笔记对子账号可见但不可改 =====
function getAdminIds() {
  try {
    const accounts = db.getAccounts() || []
    return accounts.filter((a) => a.role === 'admin').map((a) => a.id)
  } catch (_e) {
    return []
  }
}

function computeViewableNotes(account) {
  if (account.role === 'admin') {
    return (db.getNotes() || []).map((n) => ({ ...n, readOnly: false }))
  }
  const own = db.getNotesForAccount(account.id) || []
  const adminIds = getAdminIds()
  const shared = (db.getNotes() || []).filter(
    (n) => adminIds.includes(n.account_id) && n.account_id !== account.id
  )
  return [
    ...own.map((n) => ({ ...n, readOnly: false })),
    ...shared.map((n) => ({ ...n, readOnly: true }))
  ]
}

function canWriteNote(account, note) {
  if (!note) return false
  if (account.role === 'admin') return true
  return note.account_id === account.id
}

// 返回当前账号可读的笔记（含只读的管理员共享笔记）
function serveMobileNotesApi(res, account) {
  try {
    const notes = computeViewableNotes(account).map(n => ({
      id: n.id,
      title: n.title || '无标题笔记',
      content: n.content || '',
      contentText: (n.contentText || '').substring(0, 5000),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      account_id: n.account_id,
      readOnly: !!n.readOnly
    }))
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, notes }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Internal error' }))
  }
}

// 返回当前账号的所有会话（按账号隔离）
function serveMobileSessionsApi(res, account) {
  try {
    const sessions = db.getSessionsForAccount(account.id).map(s => ({
      id: s.id,
      title: s.title || '未命名对话',
      preview: s.preview || '',
      updatedAt: s.updatedAt
    }))
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, sessions }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Internal error' }))
  }
}

// 返回单个会话详情（含消息列表，校验归属）
function serveMobileSessionDetailApi(res, sessionId, account) {
  try {
    const session = db.getSessionForAccount(sessionId, account.id)
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: false, error: 'Session not found' }))
      return
    }
    const messages = db.getMessages(sessionId)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, session, messages }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Internal error' }))
  }
}

// 返回单个笔记详情（校验读权限；管理员笔记对子账号只读）
function serveMobileNoteDetailApi(res, noteId, account) {
  try {
    const note = db.getNote(noteId)
    if (!note) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: false, error: 'Note not found' }))
      return
    }
    const viewable =
      account.role === 'admin' ||
      note.account_id === account.id ||
      getAdminIds().includes(note.account_id)
    if (!viewable) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: false, error: '无权限查看该笔记' }))
      return
    }
    const out = { ...note, readOnly: !canWriteNote(account, note) }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, note: out }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Internal error' }))
  }
}

// DeepSeek Harness 相关 API
function serveHarnessStatusApi(res) {
  try {
    const status = getHarnessPublicStatusWithDiag()
    // 如果 harness 正在运行，提供代理 URL 供手机端访问
    if (status.status === 'ready' && status.url) {
      status.proxyUrl = `/api/mobile/harness/proxy`
    }
    console.log('[ShareServer] Harness status:', JSON.stringify(status))
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, status }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Internal error' }))
  }
}

async function serveHarnessStartApi(res) {
  try {
    console.log('[ShareServer] POST /api/mobile/harness/start called')
    console.log('[ShareServer] startHarnessSidecar type:', typeof startHarnessSidecar)
    const promise = startHarnessSidecar()
    console.log('[ShareServer] startHarnessSidecar returned, type:', typeof promise)
    promise.catch(e => {
      console.error('[ShareServer] Harness start background error:', e?.message || e)
    })
    await new Promise(resolve => setTimeout(resolve, 500))
    const status = getHarnessPublicStatusWithDiag()
    if (status.status === 'ready' && status.url) {
      status.proxyUrl = `/api/mobile/harness/proxy`
    }
    console.log('[ShareServer] Harness status after start call:', JSON.stringify({ status: status.status, error: status.error, recentOutput: (status.recentOutput || []).slice(-3) }))
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, status }))
  } catch (e) {
    console.error('[ShareServer] Harness start API error:', e)
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: e?.message || 'Failed to start harness' }))
  }
}

async function serveHarnessRestartApi(res) {
  try {
    const status = await restartHarnessSidecar()
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, status }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: e?.message || 'Failed to restart harness' }))
  }
}

// 代理 Harness Web UI 请求（手机端无法直接访问 127.0.0.1）
function proxyHarnessRequest(req, res) {
  const status = getHarnessPublicStatus()
  if (!status.url) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Harness not running' }))
    return
  }
  const targetUrl = new URL(req.url, `http://${req.headers.host}`)
  const harnessPath = targetUrl.pathname.replace('/api/mobile/harness/proxy', '') || '/'
  const harnessSearch = targetUrl.search || ''
  const fullUrl = `${status.url}${harnessPath}${harnessSearch}`

  const proxyReq = http.request(fullUrl, {
    method: req.method,
    headers: { ...req.headers, host: `${status.url.replace('http://', '')}` }
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res)
  })
  proxyReq.on('error', (e) => {
    console.error('[ShareServer] Harness proxy error:', e.message)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: false, error: 'Proxy error: ' + e.message }))
    }
  })
  req.pipe(proxyReq)
}

// 搜索笔记（按账号隔离）
function serveMobileSearchNotesApi(res, query, account) {
  try {
    const q = (query || '').toString().trim()
    if (!q) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: true, notes: [] }))
      return
    }
    const lower = q.toLowerCase()
    const notes = computeViewableNotes(account)
      .filter(n =>
        (n.title || '').toLowerCase().includes(lower) ||
        (n.contentText || '').toLowerCase().includes(lower)
      )
      .map(n => ({
        id: n.id,
        title: n.title || '无标题笔记',
        contentText: (n.contentText || '').substring(0, 200),
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        account_id: n.account_id,
        readOnly: !!n.readOnly
      }))
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, notes }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Internal error' }))
  }
}

// 读取 POST 请求体
function readPostBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch (e) {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

// 手机扫码登录：临时 QR Token 存储（60秒过期）
const qrTokens = new Map() // token -> { accountId, expiresAt }

function generateQrToken(accountId) {
  const token = crypto.randomBytes(24).toString('hex')
  qrTokens.set(token, { accountId, expiresAt: Date.now() + 60000 })
  return token
}

function verifyQrToken(token) {
  const entry = qrTokens.get(token)
  if (!entry) return null
  qrTokens.delete(token) // 一次性使用
  if (Date.now() > entry.expiresAt) return null
  return db.getAccountById ? db.getAccountById(entry.accountId) : null
}

// 从 Authorization 头解析已登录账号（Bearer Token）
function getAccountFromRequest(req) {
  const auth = req.headers['authorization'] || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return null
  return getAccountByToken(m[1].trim())
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}

// 账号登录：校验用户名密码，签发 Bearer Token（设备绑定信息一并返回）
async function serveLoginApi(req, res) {
  let body
  try {
    body = await readPostBody(req)
  } catch (_e) {
    sendJson(res, 400, { success: false, error: '请求体格式错误' })
    return
  }
  const username = (body.username || '').toString().trim()
  const password = (body.password || '').toString()
  if (!username || !password) {
    sendJson(res, 400, { success: false, error: '用户名和密码不能为空' })
    return
  }
  const account = authenticate(username, password)
  if (!account) {
    sendJson(res, 401, { success: false, error: '用户名或密码错误' })
    return
  }
  const token = issueToken(account)
  sendJson(res, 200, {
    success: true,
    token,
    username: account.username,
    role: account.role,
    deviceId: account.device_id,
    deviceName: os.hostname()
  })
}

// 账号注册（仅管理员可用）：创建员工账号，绑定到同一台 PC 设备
async function serveRegisterApi(req, res, adminAccount) {
  let body
  try {
    body = await readPostBody(req)
  } catch (_e) {
    sendJson(res, 400, { success: false, error: '请求体格式错误' })
    return
  }
  const username = (body.username || '').toString().trim()
  const password = (body.password || '').toString()
  if (!username || !password) {
    sendJson(res, 400, { success: false, error: '用户名和密码不能为空' })
    return
  }
  if (password.length < 8) {
    sendJson(res, 400, { success: false, error: '密码长度至少 8 位' })
    return
  }
  if (getAccountByUsername(username)) {
    sendJson(res, 409, { success: false, error: '账号已存在' })
    return
  }
  const role = body.role === 'admin' ? 'admin' : 'user'
  createAccount(username, password, { role, deviceId: adminAccount.device_id })
  sendJson(res, 200, { success: true })
}

// 修改密码：验证原密码后更新当前登录账号的密码
async function serveChangePasswordApi(req, res, account) {
  let body
  try {
    body = await readPostBody(req)
  } catch (_e) {
    sendJson(res, 400, { success: false, error: '请求体格式错误' })
    return
  }
  const oldPassword = (body.oldPassword || '').toString()
  const newPassword = (body.newPassword || '').toString()
  if (!oldPassword || !newPassword) {
    sendJson(res, 400, { success: false, error: '请输入原密码和新密码' })
    return
  }
  if (newPassword.length < 8) {
    sendJson(res, 400, { success: false, error: '新密码长度至少 8 位' })
    return
  }
  if (!authenticate(account.username, oldPassword)) {
    sendJson(res, 401, { success: false, error: '原密码错误' })
    return
  }
  try {
    changePassword(account.id, newPassword)
    sendJson(res, 200, { success: true })
  } catch (e) {
    sendJson(res, 500, { success: false, error: '修改失败：' + (e?.message || e) })
  }
}

// 返回桌面端可用模型列表（供手机端自动获取，从而能发起对话）
function serveMobileModelsApi(res) {
  try {
    const config = loadConfig()
    const models = Array.isArray(config.customModels) ? config.customModels : []
    const list = models.map((m) => ({
      id: m.id,
      modelName: m.modelName || m.id,
      name: m.name || m.modelName || m.id,
      baseUrl: m.baseUrl || ''
    }))
    const selected = config.selectedModelId || (list[0] && list[0].id) || null
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      success: true,
      models: list,
      selectedModelId: selected,
      hasModel: list.length > 0
    }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Internal error' }))
  }
}

// 手机端发起对话：把消息交给桌面端 Friday 智能体，并持久化到桌面会话
async function serveMobileChatApi(req, res, account) {
  let body
  try {
    body = await readPostBody(req)
  } catch (_e) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: 'Invalid request body' }))
    return
  }

    const message = (body.message || '').toString().trim()
    if (!message) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: false, error: '消息内容不能为空' }))
      return
    }

    try {
      // 复用或创建桌面端会话（手机端对话归属到当前登录账号，便于在桌面继续）
      let sessionId = body.sessionId
      let session = sessionId ? db.getSessionForAccount(sessionId, account.id) : null
      if (!session) {
        session = db.createSession('手机对话', 'chat', account.id)
        sessionId = session.id
      }

    // 持久化用户消息
    db.saveMessage(sessionId, 'user', message)

    // 构造完整历史（来自桌面端数据库，保证上下文连续）
    const history = db.getMessages(sessionId).map((m) => ({
      role: m.role,
      content: m.content
    }))

    // 调用 Friday 智能体（使用桌面端已配置的模型）
    const { content, reasoning } = await runAgent({
      messages: history,
      model: body.model || undefined,
      unattended: true
    })

    if (!content) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ success: false, error: '模型未返回内容，请检查桌面端模型配置', sessionId }))
      return
    }

    // 持久化助手回复
    db.saveMessage(sessionId, 'assistant', content)
    db.updateSessionTitle(sessionId, message.slice(0, 30))

    // 通知桌面渲染进程：该会话已被外部（手机）更新
    notifyExternalSession(sessionId, 'mobile')

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: true, sessionId, content, reasoning: reasoning || '' }))
  } catch (e) {
    console.error('[ShareServer] mobile chat error:', e)
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ success: false, error: e?.message || '对话失败', sessionId: body.sessionId || null }))
  }
}

// ===== 笔记/会话写操作（按账号隔离，供桌面端/手机端连中央机时使用）=====
async function serveMobileCreateNoteApi(req, res, account) {
  let body
  try { body = await readPostBody(req) } catch (_e) { sendJson(res, 400, { success: false, error: '请求体格式错误' }); return }
  const title = ((body.title || '').toString().trim()) || '新建笔记'
  const content = (body.content || '').toString()
  const contentText = (body.contentText || '').toString()
  try {
    db.setCurrentAccountId(account.id)
    const note = db.createNote(null, null, title)
    db.updateNote(note.id, title, content, contentText, null)
    sendJson(res, 200, { success: true, note: db.getNoteForAccount(note.id, account.id) })
  } catch (e) {
    sendJson(res, 500, { success: false, error: '创建笔记失败：' + (e?.message || e) })
  }
}

async function serveMobileUpdateNoteApi(req, res, account, noteId) {
  const note = db.getNote(noteId)
  if (!note) {
    sendJson(res, 404, { success: false, error: '笔记不存在' })
    return
  }
  if (!canWriteNote(account, note)) {
    sendJson(res, 403, { success: false, error: '无权限修改该笔记（只读共享）' })
    return
  }
  let body
  try { body = await readPostBody(req) } catch (_e) { sendJson(res, 400, { success: false, error: '请求体格式错误' }); return }
  const title = (body.title || '').toString()
  const content = (body.content || '').toString()
  const contentText = (body.contentText || '').toString()
  try {
    const updated = db.updateNote(noteId, title, content, contentText, null)
    sendJson(res, 200, { success: true, note: { ...(updated || note), readOnly: false } })
  } catch (e) {
    sendJson(res, 500, { success: false, error: '更新笔记失败：' + (e?.message || e) })
  }
}

async function serveMobileDeleteNoteApi(req, res, account, noteId) {
  const note = db.getNote(noteId)
  if (!note) {
    sendJson(res, 404, { success: false, error: '笔记不存在' })
    return
  }
  if (!canWriteNote(account, note)) {
    sendJson(res, 403, { success: false, error: '无权限删除该笔记（只读共享）' })
    return
  }
  try {
    db.softDeleteNote(noteId)
    sendJson(res, 200, { success: true })
  } catch (e) {
    sendJson(res, 500, { success: false, error: '删除笔记失败：' + (e?.message || e) })
  }
}

async function serveMobileCreateSessionApi(req, res, account) {
  let body = {}
  try { body = await readPostBody(req) } catch (_e) {}
  const title = ((body.title || '').toString().trim()) || '新对话'
  try {
    db.setCurrentAccountId(account.id)
    const session = db.createSession(title, 'chat', account.id)
    sendJson(res, 200, { success: true, session })
  } catch (e) {
    sendJson(res, 500, { success: false, error: '创建会话失败：' + (e?.message || e) })
  }
}

async function serveMobileUpdateSessionApi(req, res, account, sessionId) {
  if (!db.getSessionForAccount(sessionId, account.id)) {
    sendJson(res, 404, { success: false, error: '会话不存在' })
    return
  }
  let body
  try { body = await readPostBody(req) } catch (_e) { sendJson(res, 400, { success: false, error: '请求体格式错误' }); return }
  const title = (body.title || '').toString()
  if (!title) { sendJson(res, 400, { success: false, error: '标题不能为空' }); return }
  try {
    db.updateSessionTitle(sessionId, title)
    sendJson(res, 200, { success: true, session: db.getSessionForAccount(sessionId, account.id) })
  } catch (e) {
    sendJson(res, 500, { success: false, error: '更新会话失败：' + (e?.message || e) })
  }
}

async function serveMobileDeleteSessionApi(req, res, account, sessionId) {
  if (!db.getSessionForAccount(sessionId, account.id)) {
    sendJson(res, 404, { success: false, error: '会话不存在' })
    return
  }
  try {
    db.deleteSession(sessionId)
    sendJson(res, 200, { success: true })
  } catch (e) {
    sendJson(res, 500, { success: false, error: '删除会话失败：' + (e?.message || e) })
  }
}

// ===== 知识库（只读共享：子账号可浏览目录树、查看文件内容，无写接口）=====
function resolveKbPath(relPath) {
  const root = path.join(getDataDir(), 'knowledge')
  if (!relPath) return root
  const abs = path.resolve(root, relPath)
  const rel = path.relative(root, abs)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null
  return abs
}

function serveMobileKbTreeApi(res, account) {
  const root = path.join(getDataDir(), 'knowledge')
  const categories = []
  try {
    if (!fs.existsSync(root)) {
      sendJson(res, 200, { success: true, categories: [], readOnly: account.role !== 'admin' })
      return
    }
    const catEntries = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    for (const cat of catEntries) {
      const catDir = path.join(root, cat.name)
      const items = fs
        .readdirSync(catDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((kb) => ({ id: `kb-${cat.name}-${kb.name}`, name: kb.name }))
      categories.push({ id: cat.name, name: cat.name, items })
    }
    sendJson(res, 200, { success: true, categories, readOnly: account.role !== 'admin' })
  } catch (e) {
    sendJson(res, 500, { success: false, error: e.message })
  }
}

async function serveMobileKbReadDirApi(req, res, account) {
  const url = new URL(req.url, 'http://localhost')
  const rel = url.searchParams.get('p') || ''
  const abs = resolveKbPath(rel)
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    sendJson(res, 200, { success: true, entries: [], readOnly: account.role !== 'admin' })
    return
  }
  try {
    const root = path.join(getDataDir(), 'knowledge')
    const entries = fs
      .readdirSync(abs, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => {
        const full = path.join(abs, e.name)
        const stat = fs.statSync(full)
        return {
          name: e.name,
          path: path.relative(root, full),
          isDirectory: e.isDirectory(),
          size: stat.size,
          modifiedTime: stat.mtime.toISOString()
        }
      })
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name, 'zh-CN')
      })
    sendJson(res, 200, { success: true, entries, readOnly: account.role !== 'admin' })
  } catch (e) {
    sendJson(res, 500, { success: false, error: e.message })
  }
}

async function serveMobileKbFileApi(req, res, account) {
  const url = new URL(req.url, 'http://localhost')
  const rel = url.searchParams.get('p') || ''
  const abs = resolveKbPath(rel)
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    sendJson(res, 404, { success: false, error: '文件不存在' })
    return
  }
  try {
    const content = fs.readFileSync(abs, 'utf-8')
    sendJson(res, 200, { success: true, content, readOnly: account.role !== 'admin' })
  } catch (e) {
    sendJson(res, 500, { success: false, error: e.message })
  }
}

// 手机端路由（已通过令牌鉴权，account 为当前登录账号）
async function routeMobileApi(req, res, url, account) {
  // ===== 写操作：笔记/会话（按账号隔离）=====
  if (url.pathname === '/api/mobile/notes' && req.method === 'POST') {
    serveMobileCreateNoteApi(req, res, account)
    return
  }
  const noteWrite = url.pathname.match(/^\/api\/mobile\/note\/(.+)$/)
  if (noteWrite) {
    const id = decodeURIComponent(noteWrite[1])
    if (req.method === 'PUT') { serveMobileUpdateNoteApi(req, res, account, id); return }
    if (req.method === 'DELETE') { serveMobileDeleteNoteApi(req, res, account, id); return }
  }
  if (url.pathname === '/api/mobile/sessions' && req.method === 'POST') {
    serveMobileCreateSessionApi(req, res, account)
    return
  }
  const sessionWrite = url.pathname.match(/^\/api\/mobile\/session\/(.+)$/)
  if (sessionWrite) {
    const id = decodeURIComponent(sessionWrite[1])
    if (req.method === 'PUT') { serveMobileUpdateSessionApi(req, res, account, id); return }
    if (req.method === 'DELETE') { serveMobileDeleteSessionApi(req, res, account, id); return }
  }

  // ===== WoL 远程开机（需要登录）=====
  if (url.pathname === '/api/mobile/wol' && req.method === 'GET') {
    const config = loadConfig()
    sendJson(res, 200, { success: true, computers: config.wolComputers || [] })
    return
  }
  if (url.pathname === '/api/mobile/wol' && req.method === 'POST') {
    let body
    try { body = await readPostBody(req) } catch (_) { sendJson(res, 400, { success: false, error: '请求体格式错误' }); return }
    const computers = Array.isArray(body.computers) ? body.computers : []
    const config = loadConfig()
    config.wolComputers = computers
    saveConfig(config)
    sendJson(res, 200, { success: true })
    return
  }
  if (url.pathname === '/api/mobile/wol/wake' && req.method === 'POST') {
    let body
    try { body = await readPostBody(req) } catch (_) { sendJson(res, 400, { success: false, error: '请求体格式错误' }); return }
    const { mac, broadcast } = body
    if (!mac) { sendJson(res, 400, { success: false, error: 'mac 不能为空' }); return }
    try {
      const dgram = await import('dgram')
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
      const macBytes = mac.split(':').map(s => parseInt(s, 16))
      if (macBytes.length !== 6) throw new Error('MAC 地址格式无效')
      const magic = Buffer.alloc(6 + 16 * 6)
      magic.fill(0xFF, 0, 6)
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 6; j++) {
          magic[6 + i * 6 + j] = macBytes[j]
        }
      }
      await new Promise((resolve, reject) => {
        socket.bind(() => {
          socket.setBroadcast(true)
          socket.send(magic, 0, magic.length, 9, broadcast || '255.255.255.255', (err) => {
            socket.close()
            if (err) reject(err)
            else resolve()
          })
        })
      })
      sendJson(res, 200, { success: true })
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message || '发送失败' })
    }
    return
  }

  // DeepSeek Harness 状态（GET）
  if (url.pathname === '/api/mobile/harness/status' && req.method === 'GET') {
    serveHarnessStatusApi(res)
    return
  }
  // DeepSeek Harness 启动（POST）
  if (url.pathname === '/api/mobile/harness/start' && req.method === 'POST') {
    serveHarnessStartApi(res)
    return
  }
  // DeepSeek Harness 重启（POST）
  if (url.pathname === '/api/mobile/harness/restart' && req.method === 'POST') {
    serveHarnessRestartApi(res)
    return
  }
  // DeepSeek Harness 代理（所有方法）
  if (url.pathname.startsWith('/api/mobile/harness/proxy')) {
    proxyHarnessRequest(req, res)
    return
  }
  // 模型列表（GET）
  if (url.pathname === '/api/mobile/models' && req.method === 'GET') {
    serveMobileModelsApi(res)
    return
  }
  // 发起对话（POST）
  if (url.pathname === '/api/mobile/chat' && req.method === 'POST') {
    serveMobileChatApi(req, res, account)
    return
  }
  if (url.pathname === '/api/mobile/sessions') {
    serveMobileSessionsApi(res, account)
    return
  }
  if (url.pathname === '/api/mobile/notes') {
    serveMobileNotesApi(res, account)
    return
  }
  // 知识库（只读）：目录树 / 列目录 / 读文件
  if (url.pathname === '/api/mobile/kb/tree' && req.method === 'GET') {
    serveMobileKbTreeApi(res, account)
    return
  }
  if (url.pathname === '/api/mobile/kb/read-dir' && req.method === 'GET') {
    serveMobileKbReadDirApi(req, res, account)
    return
  }
  if (url.pathname === '/api/mobile/kb/file' && req.method === 'GET') {
    serveMobileKbFileApi(req, res, account)
    return
  }
  const mobileNoteSearch = url.pathname.match(/^\/api\/mobile\/notes\/search$/)
  if (mobileNoteSearch) {
    serveMobileSearchNotesApi(res, url.searchParams.get('q') || '', account)
    return
  }
  const mobileSessionMatch = url.pathname.match(/^\/api\/mobile\/session\/(.+)$/)
  if (mobileSessionMatch) {
    serveMobileSessionDetailApi(res, decodeURIComponent(mobileSessionMatch[1]), account)
    return
  }
  const mobileNoteMatch = url.pathname.match(/^\/api\/mobile\/note\/(.+)$/)
  if (mobileNoteMatch) {
    serveMobileNoteDetailApi(res, decodeURIComponent(mobileNoteMatch[1]), account)
    return
  }
  sendJson(res, 404, { success: false, error: 'Not Found' })
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)

    // 健康检查
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    // ===== 手机扫码登录中间页（公开接口，无需 token）=====
    // 手机扫描 PC 二维码后访问此页面，页面内自动调用 qr-verify 并通过 Deep Link 跳转回 App
    if (url.pathname === '/mobile/qr-login' && req.method === 'GET') {
      const qrToken = url.searchParams.get('qrToken') || ''
      if (!qrToken) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<html><body style="text-align:center;padding:40px;font-family:sans-serif"><h2>参数缺失</h2><p>缺少 qrToken 参数</p></body></html>')
        return
      }
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Happy Friday - 扫码登录</title>
<style>body{font-family:-apple-system,sans-serif;text-align:center;padding:60px 20px;margin:0;background:#f5f5f5}
.box{background:#fff;border-radius:12px;padding:32px;max-width:360px;margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.spinner{width:32px;height:32px;border:3px solid #e0e0e0;border-top-color:#1976d2;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
.ok{color:#2e7d32;font-size:18px;font-weight:bold}.err{color:#c62828}</style></head>
<body><div class="box">
<div class="spinner" id="sp"></div>
<div id="msg">正在登录，请稍候...</div>
</div>
<script>
(function(){
  var qrToken=${JSON.stringify(qrToken)};
  fetch('/api/auth/qr-verify',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({qrToken:qrToken})
  }).then(function(r){return r.json()}).then(function(d){
    document.getElementById('sp').style.display='none';
    if(d.success){
      document.getElementById('msg').innerHTML='<div class="ok">登录成功！</div><p>正在跳转到 App...</p>';
      var params='token='+encodeURIComponent(d.token)+'&username='+encodeURIComponent(d.username||'')+'&server='+encodeURIComponent(d.server||'')+'&deviceId='+encodeURIComponent(d.deviceId||'')+'&role='+encodeURIComponent(d.role||'');
      window.location.href='happyfriday://login?'+params;
      setTimeout(function(){document.getElementById('msg').innerHTML+='<p style="color:#666;font-size:13px">如果没有自动跳转，请 <a href="happyfriday://login?'+params+'">点击这里</a></p>'},2000);
    }else{
      document.getElementById('msg').innerHTML='<div class="err">登录失败</div><p>'+((d.error)||'二维码已过期或无效')+'</p><p>请返回 PC 端刷新二维码后重试</p>';
    }
  }).catch(function(e){
    document.getElementById('sp').style.display='none';
    document.getElementById('msg').innerHTML='<div class="err">网络错误</div><p>'+e.message+'</p><p>请检查手机网络连接</p>';
  });
})();
</script></body></html>`
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }

    // ===== 账号体系（公开接口）=====
    // 登录：签发 Bearer Token，返回设备绑定信息
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      serveLoginApi(req, res)
      return
    }
    // 手机扫码登录：PC端生成临时QR token（需要已登录的管理员token）
    if (url.pathname === '/api/auth/qr-generate' && req.method === 'POST') {
      const account = getAccountFromRequest(req)
      if (!account) { sendJson(res, 401, { success: false, error: '未授权' }); return }
      const qrToken = generateQrToken(account.id)
      sendJson(res, 200, { success: true, qrToken, expiresIn: 60 })
      return
    }
    // 手机扫码登录：手机端用QR token换取session token
    if (url.pathname === '/api/auth/qr-verify' && req.method === 'POST') {
      let body
      try { body = await readPostBody(req) } catch (_) { sendJson(res, 400, { success: false, error: '请求体格式错误' }); return }
      const qrToken = (body.qrToken || '').toString().trim()
      if (!qrToken) { sendJson(res, 400, { success: false, error: 'qrToken 不能为空' }); return }
      const account = verifyQrToken(qrToken)
      if (!account) { sendJson(res, 401, { success: false, error: '二维码已过期或无效' }); return }
      const sessionToken = issueToken(account)
      const serverUrl = `http://${req.headers.host || 'localhost'}`
      sendJson(res, 200, {
        success: true,
        token: sessionToken,
        username: account.username,
        role: account.role,
        deviceId: account.device_id,
        deviceName: os.hostname(),
        server: serverUrl
      })
      return
    }
    // 注册员工账号（仅管理员）
    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      const admin = getAccountFromRequest(req)
      if (!admin || admin.role !== 'admin') {
        sendJson(res, 401, { success: false, error: '未授权：需要管理员令牌' })
        return
      }
      serveRegisterApi(req, res, admin)
      return
    }
    // 当前登录账号信息
    if (url.pathname === '/api/auth/me' && req.method === 'GET') {
      const account = getAccountFromRequest(req)
      if (!account) {
        sendJson(res, 401, { success: false, error: '未授权' })
        return
      }
      sendJson(res, 200, {
        success: true,
        username: account.username,
        role: account.role,
        deviceId: account.device_id,
        deviceName: os.hostname()
      })
      return
    }

    // 修改密码（需登录令牌）
    if (url.pathname === '/api/auth/change-password' && req.method === 'POST') {
      const account = getAccountFromRequest(req)
      if (!account) {
        sendJson(res, 401, { success: false, error: '未授权' })
        return
      }
      serveChangePasswordApi(req, res, account)
      return
    }

    // ===== 手机端 API（全部需要登录令牌）=====
    if (url.pathname.startsWith('/api/mobile/')) {
      const account = getAccountFromRequest(req)
      if (!account) {
        sendJson(res, 401, { success: false, error: '未授权：请先登录' })
        return
      }
      routeMobileApi(req, res, url, account)
      return
    }

    // 笔记分享数据接口 /api/share/note/:noteId（需在会话接口之前匹配）
    const noteApiMatch = url.pathname.match(/^\/api\/share\/note\/(.+)$/)
    if (noteApiMatch) {
      serveNoteShareApi(res, decodeURIComponent(noteApiMatch[1]))
      return
    }

    // 分享数据接口 /api/share/:sessionId
    const apiMatch = url.pathname.match(/^\/api\/share\/(.+)$/)
    if (apiMatch) {
      serveShareApi(res, decodeURIComponent(apiMatch[1]))
      return
    }

    // 其余请求交给静态文件服务（含 SPA 回退）
    serveStatic(res, url.pathname)
  } catch (e) {
    console.error('[ShareServer] request error:', e)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Internal Server Error')
    }
  }
}

// 启动分享服务：优先使用固定端口，被占用时回退到随机端口
export async function startShareServer() {
  if (server) return serverPort

  // 初始化企业版账号体系（主账号引导 + 设备绑定 + 既有数据归属）
  try {
    const primary = bootstrapAuth(process.env)
    console.log(`[ShareServer] ✅ 账号体系已初始化，主账号: ${primary.username}（设备 ${primary.device_id}）`)
  } catch (e) {
    console.error('[ShareServer] 账号体系初始化失败:', e)
  }

  return new Promise((resolve) => {
    const tryListen = (port) => {
      const s = http.createServer(handleRequest)
      s.on('error', () => {
        if (port !== 0) {
          tryListen(0)
        } else {
          console.error('[ShareServer] Failed to start share server')
          resolve(null)
        }
      })
      s.listen(port, '0.0.0.0', () => {
        server = s
        serverPort = s.address().port
        console.log(`[ShareServer] ✅ Share server running on http://0.0.0.0:${serverPort}`)
        resolve(serverPort)
      })
    }
    tryListen(PREFERRED_PORT)
  })
}

export function stopShareServer() {
  if (server) {
    try { server.close() } catch (_e) {}
    server = null
    serverPort = null
  }
}

// 生成分享链接：使用 hash 路由，浏览器打开后由前端路由进入分享视图
export function getShareUrl(sessionId) {
  if (!serverPort) return null
  const ip = getLocalIp()
  return `http://${ip}:${serverPort}/#/share/${encodeURIComponent(sessionId)}`
}

// 生成笔记分享链接
export function getNoteShareUrl(noteId) {
  if (!serverPort) return null
  const ip = getLocalIp()
  return `http://${ip}:${serverPort}/#/share/note/${encodeURIComponent(noteId)}`
}

// 生成手机端链接
export function getMobileUrl() {
  if (!serverPort) return null
  const ip = getLocalIp()
  return `http://${ip}:${serverPort}/#/mobile`
}

export function getMobileUrlWithPort(port) {
  if (!port) return null
  const ip = getLocalIp()
  return `http://${ip}:${port}/#/mobile`
}

export function getServerPort() {
  return serverPort
}
