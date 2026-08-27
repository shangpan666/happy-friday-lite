/**
 * 内置浏览器管理器
 * ================
 * 提供一个应用内 Chromium 浏览器窗口，供 Agent 工具驱动：
 *   - Agent 导航/操作页面时自动显示窗口，用户可以直观看到 AI 的操作过程
 *   - 持续捕获控制台输出、页面 JS 错误、资源加载失败，供 Agent 定位 BUG
 *
 * 窗口被用户手动关闭后不自动重建；下次 Agent 调用工具时按需重建（隐藏）。
 */

import { BrowserWindow } from 'electron'
import path from 'path'
import { createLogger } from './logger.js'

const log = createLogger('Browser')

const MAX_CONSOLE_LINES = 200
const NAVIGATE_TIMEOUT_MS = 30000

let browserWindow = null
let consoleLines = [] // { level, text, source, line, at }
let loadErrors = [] // { url, description, code, at }
let lastNavigateAt = 0

function isDev() {
  return !app.isPackaged
}

function resetCaptureBuffers() {
  consoleLines = []
  loadErrors = []
  lastNavigateAt = Date.now()
}

function attachListeners(win) {
  const wc = win.webContents

  wc.on('console-message', (_event, level, message, lineNumber, sourceId) => {
    consoleLines.push({
      level, // 0 verbose 1 info 2 warning 3 error
      text: String(message),
      source: String(sourceId || '').split(/[\\/]/).pop() || '',
      line: lineNumber,
      at: new Date().toISOString()
    })
    if (consoleLines.length > MAX_CONSOLE_LINES) consoleLines.shift()
  })

  wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame && errorCode === -3) return // 忽略中断的子资源请求
    loadErrors.push({
      url: validatedURL,
      code: errorCode,
      description: errorDescription,
      mainFrame: isMainFrame,
      at: new Date().toISOString()
    })
    if (loadErrors.length > 50) loadErrors.shift()
  })

  wc.on('preload-error', (_event, preloadPath, error) => {
    loadErrors.push({
      url: preloadPath,
      code: 'PRELOAD',
      description: String(error),
      mainFrame: false,
      at: new Date().toISOString()
    })
  })

  wc.on('render-process-gone', (_event, details) => {
    loadErrors.push({
      url: wc.getURL(),
      code: 'RENDER_GONE',
      description: details.reason,
      mainFrame: true,
      at: new Date().toISOString()
    })
  })
}

function ensureBrowserWindow({ show = false } = {}) {
  // 用户手动关闭后 browserWindow 已置 null；这里兜底清理已销毁的残留引用
  if (browserWindow && browserWindow.isDestroyed()) {
    browserWindow = null
  }
  if (browserWindow) {
    if (show) {
      browserWindow.show()
      browserWindow.focus()
    }
    return browserWindow
  }
  consoleLines = []
  loadErrors = []
  browserWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    show: false,
    title: 'Phronesis 内置浏览器',
    autoHideMenuBar: true,
    icon: path.join(process.cwd(), 'build', 'icons', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })
  attachListeners(browserWindow)
  browserWindow.on('closed', () => {
    browserWindow = null
  })
  if (show) {
    browserWindow.show()
  }
  return browserWindow
}

/**
 * 带自愈的窗口操作包装：
 * Agent 操作期间用户手动关闭浏览器窗口会导致 "Object has been destroyed"，
 * 这里捕获该错误并自动重建窗口重试一次，避免 Agent 陷入失败循环。
 */
async function withBrowserWindow(show, fn) {
  let lastError
  for (let attempt = 0; attempt < 2; attempt++) {
    const win = ensureBrowserWindow({ show: attempt === 0 ? show : true })
    try {
      return await fn(win)
    } catch (e) {
      lastError = e
      const destroyed = /has been destroyed|Object destroyed/i.test(e?.message || '')
      const gone = browserWindow === null || browserWindow.isDestroyed()
      if (destroyed && gone && attempt === 0) {
        log.warn('[Browser] 窗口被关闭，自动重建重试')
        continue
      }
      throw e
    }
  }
  throw lastError
}

function waitForLoad(win, timeoutMs = NAVIGATE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const start = Date.now()
    const timer = setInterval(() => {
      if (win.isDestroyed()) {
        clearInterval(timer)
        resolve({ ok: false, info: '浏览器窗口已关闭' })
        return
      }
      if (!win.webContents.isLoading() && Date.now() - start > 400) {
        clearInterval(timer)
        resolve({ ok: true, info: '' })
        return
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer)
        resolve({ ok: false, info: '加载超时' })
      }
    }, 200)
  })
}

export function getBrowserWebContents() {
  return browserWindow && !browserWindow.isDestroyed() ? browserWindow.webContents : null
}

export async function browserNavigate(url, { show = true } = {}) {
  let target
  try {
    target = new URL(url)
    if (!['http:', 'https:', 'file:'].includes(target.protocol)) {
      return { ok: false, error: `不支持的协议: ${target.protocol}（仅支持 http/https/file）` }
    }
  } catch (_e) {
    return { ok: false, error: `无效的 URL: ${url}` }
  }

  return withBrowserWindow(show, async (win) => {
    resetCaptureBuffers()
    try {
      await win.loadURL(target.href)
    } catch (_e) {
      // loadURL 可能因 did-fail-load reject，错误信息已在 loadErrors 中
    }
    const result = await waitForLoad(win)
    // 等待 SPA 渲染
    await new Promise((r) => setTimeout(r, 600))
    if (win.isDestroyed()) {
      return { ok: false, error: '浏览器窗口已关闭' }
    }
    return { ok: result.ok, error: result.info, url: win.webContents.getURL(), title: win.webContents.getTitle() }
  })
}

export async function browserReload() {
  return withBrowserWindow(false, async (win) => {
    if (!win.webContents.getURL()) {
      return { ok: false, error: '尚未打开任何页面' }
    }
    resetCaptureBuffers()
    win.webContents.reload()
    const result = await waitForLoad(win)
    await new Promise((r) => setTimeout(r, 600))
    if (win.isDestroyed()) {
      return { ok: false, error: '浏览器窗口已关闭' }
    }
    return { ok: result.ok, error: result.info, url: win.webContents.getURL(), title: win.webContents.getTitle() }
  })
}

export async function browserEvaluate(code) {
  return withBrowserWindow(false, (win) => win.webContents.executeJavaScript(code, true))
    .then((result) => ({ ok: true, result }))
    .catch((e) => ({ ok: false, error: e.message }))
}

export async function browserCapturePage(filePath) {
  return withBrowserWindow(true, async (win) => {
    if (win.isMinimized()) win.restore()
    await new Promise((r) => setTimeout(r, 300))
    const image = await win.webContents.capturePage()
    const fs = await import('fs')
    fs.writeFileSync(filePath, image.toPNG())
    return { ok: true, path: filePath, size: image.getSize() }
  })
}

export function getConsoleSnapshot({ limit = 40 } = {}) {
  const recent = consoleLines.slice(-limit)
  const fmt = (l) => `[${['verbose', 'info', 'warn', 'error'][l.level] ?? l.level}] ${l.text}${l.source ? ` (${l.source}:${l.line})` : ''}`
  return {
    errors: consoleLines.filter((l) => l.level >= 3).map(fmt),
    warnings: consoleLines.filter((l) => l.level === 2).map(fmt),
    all: recent.map(fmt),
    loadErrors: loadErrors.map((e) => `[${e.code}] ${e.description} ${e.url}`)
  }
}

export function formatConsoleForPrompt({ limit = 40 } = {}) {
  const snap = getConsoleSnapshot({ limit })
  const parts = []
  if (snap.errors.length) parts.push(`错误 (${snap.errors.length}):\n` + snap.errors.slice(-20).map((s) => '  ' + s).join('\n'))
  if (snap.loadErrors.length) parts.push(`资源加载失败 (${snap.loadErrors.length}):\n` + snap.loadErrors.slice(-10).map((s) => '  ' + s).join('\n'))
  if (snap.warnings.length) parts.push(`警告 (${snap.warnings.length}):\n` + snap.warnings.slice(-10).map((s) => '  ' + s).join('\n'))
  if (!parts.length) parts.push('（无控制台错误/警告）')
  return parts.join('\n\n')
}
