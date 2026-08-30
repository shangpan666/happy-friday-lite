import { defineStore } from 'pinia'
import { electronService } from '@/services/electron'

const STORAGE_KEY = 'hf_connection'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_e) {}
  return {}
}

export const useConnectionStore = defineStore('connection', {
  state: () => ({
    serverUrl: load().serverUrl || 'http://127.0.0.1:17918',
    token: load().token || '',
    user: load().user || null
  }),
  getters: {
    isConnected: (s) => !!s.token && !!s.user,
    isCentral: (s) => {
      try {
        const u = new URL(s.serverUrl)
        return !(u.hostname === '127.0.0.1' || u.hostname === 'localhost')
      } catch (_e) {
        return false
      }
    }
  },
  actions: {
    persist() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ serverUrl: this.serverUrl, token: this.token, user: this.user })
      )
    },
    setServer(url) {
      this.serverUrl = url
      this.persist()
    },
    async login(username, password) {
      const res = await electronService.invoke('account-login', {
        username,
        password,
        base: this.serverUrl
      })
      if (res && res.success && res.token) {
        this.token = res.token
        this.user = { username: res.username || username, role: res.role || 'user' }
        this.persist()
      }
      await this.publish()
      return res
    },
    async fetchMe() {
      if (!this.token) return null
      const res = await electronService.invoke('account-me', {
        token: this.token,
        base: this.serverUrl
      })
      if (res && res.success && res.username) {
        this.user = { username: res.username, role: res.role || this.user?.role || 'user' }
        this.persist()
      }
      return res
    },
    logout() {
      this.token = ''
      this.user = null
      this.persist()
    },
    // 将当前连接信息推送给主进程，使其笔记/会话读写转发到中央机
    async publish() {
      try {
        if (this.isConnected) {
          await electronService.invoke('set_connection', {
            serverUrl: this.serverUrl,
            token: this.token
          })
        } else {
          await electronService.invoke('set_connection', { serverUrl: '', token: '' })
        }
      } catch (_e) {
        // 主进程未就绪时忽略
      }
    }
  }
})
