/**
 * 内置工具：内置浏览器（browser_*）
 * ============================================
 * 让 Agent 打开真实网页、读取页面内容与控制台错误、操作页面元素、截图，
 * 从而能"亲眼"看到页面运行状态并直观发现 BUG。
 *
 * 工具清单：
 *   - browser_navigate(url)                 打开页面（自动显示窗口，用户可观看）
 *   - browser_snapshot()                    页面概览：URL/标题/可见文本/控制台错误/加载失败
 *   - browser_console()                     详细控制台输出
 *   - browser_click(selector)               点击元素
 *   - browser_input(selector, text)         向输入框写入文本
 *   - browser_evaluate(code)                在页面执行任意 JS 并返回结果
 *   - browser_screenshot(filename)          截图保存到 /SANDBOX/exports/
 */

import { z } from 'zod'
import path from 'path'
import { registerTool } from '../registry.js'
import {
  browserNavigate,
  browserReload,
  browserEvaluate,
  browserCapturePage,
  formatConsoleForPrompt,
  getBrowserWebContents
} from '../../browserManager.js'

const TEXT_LIMIT = 8000

function requirePage() {
  const wc = getBrowserWebContents()
  if (!wc || !wc.getURL()) {
    return { error: '浏览器尚未打开页面。请先调用 browser_navigate。' }
  }
  return { wc }
}

function truncate(text, limit = TEXT_LIMIT) {
  if (text.length <= limit) return text
  return text.slice(0, limit) + `\n…（截断，共 ${text.length} 字符）`
}

// ========== browser_navigate ==========
const navigateSchema = z.object({
  url: z.string().describe('要打开的完整 URL，例如 http://localhost:5173 或 https://example.com')
})

async function navigateHandler(args, ctx) {
  ctx.logger.info(`[browser_navigate] ${args.url}`)
  const res = await browserNavigate(args.url, { show: true })
  if (!res.ok && res.error) {
    return `页面加载失败：${res.error}`
  }
  const wc = getBrowserWebContents()
  const bodyText = wc ? await wc.executeJavaScript('document.body ? document.body.innerText : ""', true).catch(() => '') : ''
  return [
    `已打开: ${res.url || args.url}`,
    `标题: ${res.title || '(无)'}`,
    res.error ? `加载警告: ${res.error}` : '',
    '',
    '控制台状态:',
    formatConsoleForPrompt({ limit: 20 }),
    '',
    '页面可见文本（前 3000 字符）:',
    truncate(String(bodyText || '').trim(), 3000)
  ].filter(Boolean).join('\n')
}

// ========== browser_snapshot ==========
const snapshotSchema = z.object({})

async function snapshotHandler(_args, ctx) {
  const page = requirePage()
  if (page.error) return page.error
  const { wc } = page
  const bodyText = await wc.executeJavaScript('document.body ? document.body.innerText : ""', true).catch(() => '')
  ctx.logger.info(`[browser_snapshot] url=${wc.getURL()}`)
  return [
    `URL: ${wc.getURL()}`,
    `标题: ${wc.getTitle()}`,
    '',
    '控制台状态:',
    formatConsoleForPrompt({ limit: 40 }),
    '',
    '页面可见文本:',
    truncate(String(bodyText || '').trim())
  ].join('\n')
}

// ========== browser_console ==========
const consoleSchema = z.object({})

async function consoleHandler(_args, ctx) {
  ctx.logger.info('[browser_console]')
  return formatConsoleForPrompt({ limit: 100 })
}

// ========== browser_click ==========
const clickSchema = z.object({
  selector: z.string().describe('CSS 选择器，例如 #submit-btn、.nav a:nth-child(2)')
})

async function clickHandler(args, ctx) {
  const page = requirePage()
  if (page.error) return page.error
  ctx.logger.info(`[browser_click] ${args.selector}`)
  const code = `
    (() => {
      const el = document.querySelector(${JSON.stringify(args.selector)});
      if (!el) return JSON.stringify({ ok: false, error: '未找到元素: ${args.selector.replace(/'/g, '')}' });
      el.scrollIntoView({ block: 'center' });
      el.click();
      return JSON.stringify({ ok: true, tag: el.tagName, text: (el.innerText || '').slice(0, 100) });
    })()
  `
  const res = await browserEvaluate(code)
  if (!res.ok) return `点击失败: ${res.error}`
  const parsed = (() => { try { return JSON.parse(res.result) } catch (_e) { return res.result } })()
  if (parsed && parsed.ok === false) return parsed.error
  await new Promise((r) => setTimeout(r, 500))
  return `已点击 ${parsed?.tag || ''} "${parsed?.text || ''}"。可用 browser_snapshot 查看页面变化。`
}

// ========== browser_input ==========
const inputSchema = z.object({
  selector: z.string().describe('目标输入元素的 CSS 选择器'),
  text: z.string().describe('要输入的文本')
})

async function inputHandler(args, ctx) {
  const page = requirePage()
  if (page.error) return page.error
  ctx.logger.info(`[browser_input] ${args.selector}, len=${args.text.length}`)
  const code = `
    (() => {
      const el = document.querySelector(${JSON.stringify(args.selector)});
      if (!el) return JSON.stringify({ ok: false, error: '未找到元素: ${args.selector.replace(/'/g, '')}' });
      el.focus();
      el.value = ${JSON.stringify(args.text)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return JSON.stringify({ ok: true });
    })()
  `
  const res = await browserEvaluate(code)
  if (!res.ok) return `输入失败: ${res.error}`
  const parsed = (() => { try { return JSON.parse(res.result) } catch (_e) { return res.result } })()
  if (parsed && parsed.ok === false) return parsed.error
  return `已在 ${args.selector} 中输入文本（长度 ${args.text.length}）。`
}

// ========== browser_evaluate ==========
const evaluateSchema = z.object({
  code: z.string().describe('要在页面中执行的 JavaScript 表达式（将返回其结果，对象会被 JSON 序列化）')
})

async function evaluateHandler(args, ctx) {
  const page = requirePage()
  if (page.error) return page.error
  ctx.logger.info(`[browser_evaluate] len=${args.code.length}`)
  const res = await browserEvaluate(args.code)
  if (!res.ok) return `执行失败: ${res.error}`
  const text = typeof res.result === 'string' ? res.result : JSON.stringify(res.result, null, 2)
  return `执行结果:\n${truncate(String(text ?? 'undefined'))}`
}

// ========== browser_screenshot ==========
const screenshotSchema = z.object({
  filename: z.string().optional().describe('保存的文件名（不含路径），默认 screenshot-时间戳.png')
})

async function screenshotHandler(args, ctx) {
  const name = args.filename || `screenshot-${Date.now()}.png`
  const safeName = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
  const dir = path.join(ctx.agentRootDir, 'SANDBOX', 'exports')
  const fs = await import('fs')
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, safeName)
  ctx.logger.info(`[browser_screenshot] ${filePath}`)
  const res = await browserCapturePage(filePath)
  if (!res.ok) return `截图失败: ${res.error}`
  return `截图已保存: /SANDBOX/exports/${safeName}（尺寸 ${res.size.width}x${res.size.height}）`
}

registerTool({
  name: 'browser_navigate',
  description:
    '在内置浏览器中打开一个网页（会显示浏览器窗口，用户可观看）。加载完成后返回页面标题、控制台错误与可见文本。' +
    '调试本地项目时可直接打开本地开发服务器地址（如 http://localhost:5173）。',
  schema: navigateSchema,
  handler: navigateHandler,
  meta: { requireApproval: false }
})

// ========== browser_reload ==========
const reloadSchema = z.object({})

async function reloadHandler(_args, ctx) {
  ctx.logger.info('[browser_reload]')
  const res = await browserReload()
  if (!res.ok && res.error) {
    return `刷新失败: ${res.error}`
  }
  const wc = getBrowserWebContents()
  const bodyText = wc ? await wc.executeJavaScript('document.body ? document.body.innerText : ""', true).catch(() => '') : ''
  return [
    `已刷新: ${res.url}`,
    '控制台状态:',
    formatConsoleForPrompt({ limit: 30 }),
    '',
    '页面可见文本（前 2000 字符）:',
    truncate(String(bodyText || '').trim(), 2000)
  ].filter(Boolean).join('\n')
}

registerTool({
  name: 'browser_reload',
  description:
    '刷新内置浏览器当前页面（本地开发服务器热更新后用于重新验证）。返回刷新后的控制台错误与页面文本。',
  schema: reloadSchema,
  handler: reloadHandler,
  meta: { requireApproval: false }
})

registerTool({
  name: 'browser_snapshot',
  description:
    '获取内置浏览器当前页面的概览：URL、标题、控制台错误/警告/资源加载失败、页面可见文本。' +
    '排查页面 BUG 的首选工具：先看控制台错误，再看页面文本是否符合预期。',
  schema: snapshotSchema,
  handler: snapshotHandler,
  meta: { requireApproval: false }
})

registerTool({
  name: 'browser_console',
  description: '获取内置浏览器完整的控制台输出（最近 100 条，含 verbose/info/warn/error）。',
  schema: consoleSchema,
  handler: consoleHandler,
  meta: { requireApproval: false }
})

registerTool({
  name: 'browser_click',
  description: '在内置浏览器页面中点击指定 CSS 选择器匹配的元素（自动滚动到元素并触发 click 事件）。',
  schema: clickSchema,
  handler: clickHandler,
  meta: { requireApproval: false }
})

registerTool({
  name: 'browser_input',
  description: '向内置浏览器页面中指定输入元素写入文本（自动触发 input/change 事件，兼容 Vue/React 表单）。',
  schema: inputSchema,
  handler: inputHandler,
  meta: { requireApproval: false }
})

registerTool({
  name: 'browser_evaluate',
  description:
    '在内置浏览器页面上下文中执行任意 JavaScript 并返回结果。可用于查询 DOM 状态、读取变量、检查元素样式等。' +
    '示例：document.querySelectorAll(".item").length 或 getComputedStyle(document.body).fontSize',
  schema: evaluateSchema,
  handler: evaluateHandler,
  meta: { requireApproval: false }
})

registerTool({
  name: 'browser_screenshot',
  description: '对内置浏览器当前页面截图，保存到 Agent 工作区 /SANDBOX/exports/ 目录。',
  schema: screenshotSchema,
  handler: screenshotHandler,
  meta: { requireApproval: false }
})
