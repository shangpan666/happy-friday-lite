import { app, BrowserWindow, screen, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadConfig, saveConfig } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import {
  CHAT_CHUNK,
  CHAT_REASONING_CHUNK,
  CHAT_DONE,
  CHAT_ERROR,
  NOTE_AI_CHUNK,
  NOTE_AI_DONE,
  NOTE_AI_ERROR
} from './events.js'

const PET_WIDTH = 200
const PET_HEIGHT = 240
const DEFAULT_TEXT = '空闲中'

let petWindow = null
let sendWrapped = false
let activity = { state: 'idle', text: DEFAULT_TEXT }
let savePositionTimer = null
let wanderTimer = null
let wanderPauseUntil = 0
let facing = 1

function isDev() {
  return !app.isPackaged
}

function petConfig(config) {
  const pet = config?.pet
  return {
    enabled: pet?.enabled === true,
    avatar: pet?.avatar || config?.assistantProfile?.avatar || null,
    position: pet?.position || null
  }
}

function currentAvatar() {
  return petConfig(loadConfig()).avatar
}

export function setPetActivity(state, text) {
  activity = { state, text: text || (state === 'idle' ? DEFAULT_TEXT : activity.text) }
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet-status-changed', { ...activity })
  }
}

function pushSnapshot() {
  if (!petWindow || petWindow.isDestroyed()) return
  petWindow.webContents.send('pet-status-changed', { ...activity })
  petWindow.webContents.send('pet-avatar-changed', { avatar: currentAvatar() })
  petWindow.webContents.send('pet-walk-changed', { dir: facing })
}

// ===== 随机溜达：空闲时每隔一段时间在屏幕工作区内散步 =====
function startWander() {
  stopWander()
  wanderTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) return
    if (activity.state !== 'idle') return
    if (Date.now() < wanderPauseUntil) return
    if (Math.random() < 0.4) return

    const workArea = screen.getPrimaryDisplay().workArea
    const [curX, curY] = petWindow.getPosition()
    const maxX = workArea.x + workArea.width - PET_WIDTH
    const minX = workArea.x
    const maxY = workArea.y + workArea.height - PET_HEIGHT
    const minY = workArea.y

    const targetX = Math.round(minX + Math.random() * (maxX - minX))
    const targetY = Math.max(minY, Math.min(maxY, curY + Math.round((Math.random() - 0.6) * 60)))
    facing = targetX >= curX ? 1 : -1
    petWindow.webContents.send('pet-walk-changed', { dir: facing })

    const stepX = targetX > curX ? 2 : -2
    let x = curX
    let y = curY
    const walker = setInterval(() => {
      if (!petWindow || petWindow.isDestroyed()) { clearInterval(walker); return }
      if (activity.state !== 'idle') { clearInterval(walker); return }
      x += stepX
      if ((stepX > 0 && x >= targetX) || (stepX < 0 && x <= targetX)) {
        clearInterval(walker)
        return
      }
      petWindow.setPosition(x, y)
    }, 30)
  }, 25000)
}

function stopWander() {
  if (wanderTimer) {
    clearInterval(wanderTimer)
    wanderTimer = null
  }
}

function persistPosition() {
  if (!petWindow || petWindow.isDestroyed()) return
  const [x, y] = petWindow.getPosition()
  try {
    const config = loadConfig()
    config.pet = { ...(config.pet || {}), position: { x, y } }
    saveConfig(config)
  } catch (e) {
    console.warn('[Pet] Failed to save position:', e?.message)
  }
}

function createPetWindow(position) {
  const { width: areaWidth, height: areaHeight } = screen.getPrimaryDisplay().workArea
  let x = Number.isFinite(position?.x) ? position.x : areaWidth - PET_WIDTH - 24
  let y = Number.isFinite(position?.y) ? position.y : areaHeight - PET_HEIGHT - 24

  petWindow = new BrowserWindow({
    x,
    y,
    width: PET_WIDTH,
    height: PET_HEIGHT,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '..', 'preload.cjs')
    }
  })
  petWindow.setAlwaysOnTop(true, 'screen-saver')
  petWindow.on('moved', () => {
    clearTimeout(savePositionTimer)
    savePositionTimer = setTimeout(persistPosition, 600)
    // 用户手动拖动后休息一会儿再继续溜达
    wanderPauseUntil = Date.now() + 60000
  })
  petWindow.on('closed', () => {
    petWindow = null
  })
  petWindow.webContents.on('did-finish-load', () => {
    console.log('[Pet] window did-finish-load')
    setTimeout(pushSnapshot, 1500)
  })
  petWindow.once('ready-to-show', () => {
    petWindow?.showInactive()
    pushSnapshot()
    startWander()
  })

  if (isDev()) {
    petWindow.loadURL('http://localhost:5173/#/pet')
  } else {
    petWindow.loadFile(path.join(__dirname, 'dist/index.html'), { hash: '/pet' })
  }
}

export function syncPetFromConfig() {
  let conf
  try {
    conf = petConfig(loadConfig())
  } catch (e) {
    return
  }
  if (!conf.enabled) {
    stopWander()
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.destroy()
      petWindow = null
    }
    return
  }
  if (!petWindow || petWindow.isDestroyed()) {
    createPetWindow(conf.position)
  } else {
    pushSnapshot()
  }
}

// 拦截主进程向渲染进程推送的聊天事件，驱动桌宠状态：
// 首个输出片段 → 正在输出；会话结束/出错 → 空闲。
function wrapWebContentsSend(mainWindow) {
  if (sendWrapped || !mainWindow) return
  sendWrapped = true
  const webContents = mainWindow.webContents
  const original = webContents.send.bind(webContents)
  webContents.send = (channel, ...args) => {
    if (channel === CHAT_CHUNK || channel === CHAT_REASONING_CHUNK || channel === NOTE_AI_CHUNK) {
      if (activity.state === 'thinking') setPetActivity('streaming', '正在输出…')
    } else if (channel === CHAT_DONE || channel === CHAT_ERROR || channel === NOTE_AI_DONE || channel === NOTE_AI_ERROR) {
      setPetActivity('idle', DEFAULT_TEXT)
    }
    return original(channel, ...args)
  }
}

export function initPet(mainWindow) {
  ipcMain.handle('pet-get-state', () => {
    console.log('[Pet] get-state called, avatar len:', (currentAvatar() || '').length)
    return {
      ...activity,
      avatar: currentAvatar()
    }
  })
  wrapWebContentsSend(mainWindow)
  syncPetFromConfig()
}
