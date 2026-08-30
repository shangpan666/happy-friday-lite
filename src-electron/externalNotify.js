// 共享模块：用于把外部入口（手机端 / QQ 机器人等）产生的对话事件通知给桌面渲染进程
// 这样外部对话会自动出现在桌面端「周五」会话列表中，实现「在桌面端发起对话」。

let mainWindowRef = null

export function setExternalNotifyWindow(win) {
  mainWindowRef = win
}

/**
 * 通知桌面渲染进程：某个会话被外部来源更新/创建
 * @param {string} sessionId 会话 ID
 * @param {string} source 来源标识：'mobile' | 'qq' | 'qqbot' | 'napcat' | 'wechat'
 */
export function notifyExternalSession(sessionId, source) {
  try {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('friday-external-session', { sessionId, source })
    }
  } catch (_e) {
    // 忽略渲染进程未就绪的情况
  }
}
