import { ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getMobileUrl, getMobileUrlWithPort, getServerPort, getLocalIp } from './shareServer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let tunnelProcess = null
let tunnelUrl = null
let tunnelStatus = 'stopped' // stopped | starting | running | error

// 获取 cloudflared 可执行文件路径
function getCloudflaredPath() {
  const platform = process.platform
  const ext = platform === 'win32' ? '.exe' : ''

  // 开发环境下在 node_modules 或项目根目录查找
  const devPaths = [
    path.join(__dirname, '..', 'tools', `cloudflared${ext}`),
    path.join(__dirname, '..', 'bin', `cloudflared${ext}`),
  ]

  // 打包后在 app 目录查找
  const prodPaths = [
    path.join(process.resourcesPath || __dirname, `cloudflared${ext}`),
    path.join(path.dirname(process.execPath), `cloudflared${ext}`),
  ]

  const allPaths = [...devPaths, ...prodPaths]
  for (const p of allPaths) {
    if (fs.existsSync(p)) return p
  }

  // 尝试系统 PATH 中的 cloudflared
  return `cloudflared${ext}`
}

// 启动 cloudflared quick tunnel（免费，无需账户）
function startTunnel(port) {
  return new Promise((resolve, reject) => {
    if (tunnelProcess) {
      stopTunnel()
    }

    tunnelStatus = 'starting'
    const cloudflared = getCloudflaredPath()
    const args = ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate']

    console.log(`[MobileSync] Starting tunnel: ${cloudflared} ${args.join(' ')}`)

    try {
      tunnelProcess = spawn(cloudflared, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      })
    } catch (e) {
      tunnelStatus = 'error'
      reject(new Error(`Failed to start cloudflared: ${e.message}. Please install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/`))
      return
    }

    let urlFound = false
    let stderrData = ''

    tunnelProcess.stdout.on('data', (data) => {
      const text = data.toString()
      console.log('[MobileSync] tunnel stdout:', text)
      // cloudflared 输出 trycloudflare.com URL
      const match = text.match(/(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/)
      if (match && !urlFound) {
        urlFound = true
        tunnelUrl = match[1]
        tunnelStatus = 'running'
        console.log(`[MobileSync] ✅ Tunnel URL: ${tunnelUrl}`)
        resolve(tunnelUrl)
      }
    })

    tunnelProcess.stderr.on('data', (data) => {
      const text = data.toString()
      stderrData += text
      console.log('[MobileSync] tunnel stderr:', text)
      // 有些版本输出到 stderr
      const match = text.match(/(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/)
      if (match && !urlFound) {
        urlFound = true
        tunnelUrl = match[1]
        tunnelStatus = 'running'
        console.log(`[MobileSync] ✅ Tunnel URL: ${tunnelUrl}`)
        resolve(tunnelUrl)
      }
    })

    tunnelProcess.on('error', (err) => {
      tunnelStatus = 'error'
      tunnelProcess = null
      tunnelUrl = null
      console.error('[MobileSync] Tunnel process error:', err)
      reject(new Error(`Tunnel error: ${err.message}. Make sure cloudflared is installed.`))
    })

    tunnelProcess.on('close', (code) => {
      tunnelStatus = 'stopped'
      tunnelProcess = null
      tunnelUrl = null
      console.log(`[MobileSync] Tunnel process exited with code ${code}`)
    })

    // 超时
    setTimeout(() => {
      if (!urlFound) {
        stopTunnel()
        reject(new Error(`Tunnel timeout. cloudflared output: ${stderrData.slice(0, 500)}`))
      }
    }, 30000)
  })
}

function stopTunnel() {
  if (tunnelProcess) {
    try {
      tunnelProcess.kill('SIGTERM')
    } catch (_e) {}
    tunnelProcess = null
  }
  tunnelUrl = null
  tunnelStatus = 'stopped'
}

// 注册 IPC 处理器
export function registerMobileSyncHandlers() {
  // 获取手机端连接信息（含二维码数据）
  ipcMain.handle('mobile-get-qr-info', async () => {
    const port = getServerPort()
    if (!port) {
      return { success: false, error: 'Share server not running' }
    }
    const localUrl = getMobileUrl()
    return {
      success: true,
      localUrl,
      port,
      tunnelUrl,
      tunnelStatus
    }
  })

  // 启动内网穿透（非局域网访问）
  ipcMain.handle('mobile-start-tunnel', async () => {
    const port = getServerPort()
    if (!port) {
      return { success: false, error: 'Share server not running' }
    }
    try {
      const url = await startTunnel(port)
      return { success: true, tunnelUrl: url }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // 停止内网穿透
  ipcMain.handle('mobile-stop-tunnel', async () => {
    stopTunnel()
    return { success: true }
  })

  // 获取隧道状态
  ipcMain.handle('mobile-tunnel-status', async () => {
    const port = getServerPort()
    return {
      status: tunnelStatus,
      tunnelUrl,
      localUrl: getMobileUrl(),
      port
    }
  })

  // ===== 电脑端账号（登录 / 当前账号 / 管理员注册员工）=====
  // 渲染进程走 IPC 调用，由主进程以 Node 侧请求本机 shareServer，
  // 避免渲染进程浏览器环境的 CORS 限制。
  const accountBase = () => `http://127.0.0.1:${getServerPort() || 17918}`

  ipcMain.handle('account-login', async (_e, { username, password, base }) => {
    const url = base || accountBase()
    try {
      const res = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      return await res.json()
    } catch (e) {
      return { success: false, error: '无法连接电脑端服务：' + e.message }
    }
  })

  ipcMain.handle('account-me', async (_e, { token, base }) => {
    const url = base || accountBase()
    try {
      const res = await fetch(`${url}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return await res.json()
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('account-register', async (_e, { token, username, password, role, base }) => {
    const url = base || accountBase()
    try {
      const res = await fetch(`${url}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, password, role })
      })
      return await res.json()
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('account-change-password', async (_e, { token, oldPassword, newPassword, base }) => {
    const url = base || accountBase()
    try {
      const res = await fetch(`${url}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword })
      })
      return await res.json()
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

export function stopMobileSync() {
  stopTunnel()
}
