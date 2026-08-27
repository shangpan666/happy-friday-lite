/**
 * 消息桥接服务入口
 * ==================
 * 在 Electron 主进程内启动 / 停止 / 重启 OpenAI 兼容服务，使 Friday 智能体可被
 * 外部平台（QQ / LangBot、微信 ClawBot / OpenClaw 网关）作为模型后端调用。
 *
 * 由 main.js 在应用启动时调用 startBridge() 拉起；设置界面通过
 * bridge-save-config IPC 调用 restartBridge() 热重启；失败不影响主应用。
 */

import { createLogger } from '../agent/logger.js'
import { loadConfig } from '../config.js'
import { isQQOnline } from './clients/qq.js'
import { isNapCatOnline } from './clients/napcat.js'
import { isQQBotOnline } from './clients/qqbot.js'
const log = createLogger('Bridge')

let serverRef = null

async function doStart() {
  const { startOpenAIServer } = await import('./openaiServer.js')
  serverRef = startOpenAIServer()
}

let wechatRunning = false
let qqRunning = false
let napcatRunning = false
let qqbotRunning = false

export async function startWechat() {
  const { startWechat } = await import('./clients/wechat.js')
  await startWechat()
  wechatRunning = true
}
export async function stopWechat() {
  const { stopWechat } = await import('./clients/wechat.js')
  await stopWechat()
  wechatRunning = false
}
export async function startQQ() {
  const { startQQ } = await import('./clients/qq.js')
  await startQQ()
  qqRunning = true
}
export async function stopQQ() {
  const { stopQQ, isQQOnline } = await import('./clients/qq.js')
  await stopQQ()
  qqRunning = false
}
export async function startNapCat() {
  const { startNapCat } = await import('./clients/napcat.js')
  await startNapCat()
  napcatRunning = true
}
export async function stopNapCat() {
  const { stopNapCat } = await import('./clients/napcat.js')
  await stopNapCat()
  napcatRunning = false
}
export async function startQQBot() {
  const { startQQBot } = await import('./clients/qqbot.js')
  await startQQBot()
  qqbotRunning = true
}
export async function stopQQBot() {
  const { stopQQBot } = await import('./clients/qqbot.js')
  await stopQQBot()
  qqbotRunning = false
}

/**
 * 启动桥接服务（读取 config.bridge；未启用且无 FRIDAY_BRIDGE 时不会真正监听）
 */
export function startBridge() {
  doStart().catch((e) => log.error(`Bridge 启动失败: ${e?.message || e}`))
}

/**
 * 停止桥接服务（同步关闭当前监听，避免热重启时的竞态）
 */
export function stopBridge() {
  if (serverRef) {
    try {
      serverRef.close()
    } catch (_e) {
      // 忽略关闭异常
    }
    serverRef = null
    log.info('Bridge 服务已停止')
  }
}

/**
 * 热重启：先停止，再按最新配置启动
 */
export async function restartBridge() {
  stopBridge()
  // 等待端口释放，避免 EADDRINUSE
  await new Promise((r) => setTimeout(r, 300))
  await doStart()
}

/**
 * 返回当前桥接状态（供设置界面展示）
 * @returns {{ enabled: boolean, host: string, port: number, running: boolean, endpoint: string }}
 */
export function getBridgeStatus() {
  const b = (loadConfig().bridge) || {}
  const host = b.host || '127.0.0.1'
  const port = Number(b.port) || 18790
  return {
    enabled: !!b.enabled,
    host,
    port,
    running: !!serverRef,
    endpoint: `http://${host}:${port}/v1`,
    wechat: wechatRunning,
    qq: qqRunning && isQQOnline(),
    napcat: napcatRunning && isNapCatOnline(),
    qqbot: qqbotRunning && isQQBotOnline()
  }
}
