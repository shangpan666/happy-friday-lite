<template>
  <div class="mobile-panel" v-if="visible" @click.self="$emit('close')">
    <div class="panel-card">
      <div class="panel-header">
        <h3>手机连接</h3>
        <button class="close-btn" @click="$emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="panel-body">
        <!-- 二维码 -->
        <div class="qr-section">
          <div class="qr-placeholder" v-if="!localUrl">
            <div class="spinner"></div>
            <p>正在生成二维码...</p>
          </div>
          <div class="qr-code" v-else>
            <canvas ref="qrCanvas" width="200" height="200"></canvas>
            <p class="qr-hint">使用手机浏览器或微信扫一扫</p>
          </div>
        </div>

        <!-- 连接信息 -->
        <div class="connect-info" v-if="localUrl">
          <div class="info-row">
            <span class="info-label">局域网地址</span>
            <span class="info-value">{{ localUrl }}</span>
            <button class="copy-btn" @click="copyUrl(localUrl)">复制</button>
          </div>
        </div>

        <!-- 隧道控制 -->
        <div class="tunnel-section">
          <div class="tunnel-header">
            <span class="tunnel-title">外网访问</span>
            <span class="tunnel-badge" :class="tunnelStatus">
              {{ tunnelStatusText }}
            </span>
          </div>
          <p class="tunnel-desc">不在同一网络？开启内网穿透生成临时公网链接</p>
          <div class="tunnel-actions">
            <button
              v-if="tunnelStatus !== 'running'"
              class="tunnel-btn"
              :disabled="tunnelStatus === 'starting'"
              @click="startTunnel"
            >
              <svg v-if="tunnelStatus === 'starting'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              {{ tunnelStatus === 'starting' ? '连接中...' : '开启外网访问' }}
            </button>
            <button v-else class="tunnel-btn stop" @click="stopTunnel">
              停止外网访问
            </button>
          </div>
          <div class="tunnel-url" v-if="tunnelUrl">
            <div class="info-row">
              <span class="info-label">公网地址</span>
              <span class="info-value">{{ tunnelUrl }}</span>
              <button class="copy-btn" @click="copyUrl(tunnelUrl)">复制</button>
            </div>
          </div>
        </div>

        <!-- 说明 -->
        <div class="tips-section">
          <h4>使用说明</h4>
          <ul>
            <li>手机扫描上方二维码即可访问电脑端对话和笔记</li>
            <li>局域网内无需额外设置，直接扫码即可</li>
            <li>非局域网请开启外网访问（需要安装 cloudflared）</li>
            <li>手机端支持查看对话、笔记、语音输入等功能</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MobileConnectPanel',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close'],
  data() {
    return {
      localUrl: '',
      tunnelUrl: '',
      tunnelStatus: 'stopped', // stopped | starting | running | error
    }
  },
  computed: {
    tunnelStatusText() {
      const map = {
        stopped: '未开启',
        starting: '连接中',
        running: '已开启',
        error: '连接失败'
      }
      return map[this.tunnelStatus] || '未开启'
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.loadInfo()
      }
    }
  },
  methods: {
    async loadInfo() {
      if (!window.electronAPI) return
      try {
        const info = await window.electronAPI.invoke('mobile-get-qr-info')
        if (info.success) {
          this.localUrl = info.localUrl
          this.tunnelStatus = info.tunnelStatus || 'stopped'
          this.tunnelUrl = info.tunnelUrl || ''
          this.$nextTick(() => this.drawQR())
        }
      } catch (e) {
        console.error('Failed to get QR info:', e)
      }
    },
    async drawQR() {
      if (!this.localUrl || !this.$refs.qrCanvas) return
      // 使用简单的 QR 码生成（通过动态加载 qrcode 库）
      try {
        const QRCode = await this.loadQRCodeLib()
        if (QRCode) {
          await QRCode.toCanvas(this.$refs.qrCanvas, this.localUrl, {
            width: 200,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          })
        }
      } catch (e) {
        console.error('QR generation failed:', e)
        // 回退：显示文本
        this.drawFallbackQR()
      }
    },
    async loadQRCodeLib() {
      // 尝试从已安装的包加载
      try {
        const mod = await import('qrcode')
        return mod.default || mod
      } catch (_e) {
        // 如果没有安装，尝试从 CDN 加载
        return new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
          script.onload = () => resolve(window.QRCode)
          script.onerror = () => resolve(null)
          document.head.appendChild(script)
        })
      }
    },
    drawFallbackQR() {
      const canvas = this.$refs.qrCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 200, 200)
      ctx.fillStyle = '#000000'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('QR Code', 100, 90)
      ctx.font = '10px sans-serif'
      ctx.fillText('请复制链接到手机', 100, 110)
    },
    async startTunnel() {
      this.tunnelStatus = 'starting'
      try {
        const result = await window.electronAPI.invoke('mobile-start-tunnel')
        if (result.success) {
          this.tunnelUrl = result.tunnelUrl
          this.tunnelStatus = 'running'
        } else {
          this.tunnelStatus = 'error'
          console.error('Tunnel error:', result.error)
        }
      } catch (e) {
        this.tunnelStatus = 'error'
        console.error('Failed to start tunnel:', e)
      }
    },
    async stopTunnel() {
      try {
        await window.electronAPI.invoke('mobile-stop-tunnel')
        this.tunnelUrl = ''
        this.tunnelStatus = 'stopped'
      } catch (e) {
        console.error('Failed to stop tunnel:', e)
      }
    },
    copyUrl(url) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url)
      } else {
        const el = document.createElement('textarea')
        el.value = url
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
    }
  }
}
</script>

<style scoped>
.mobile-panel {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.panel-card {
  background: var(--bg-primary, #fff);
  border-radius: 16px;
  width: 380px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.panel-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.close-btn:hover {
  background: var(--bg-hover, #f3f4f6);
}

.panel-body {
  padding: 20px;
}

/* QR Section */
.qr-section {
  text-align: center;
  margin-bottom: 20px;
}

.qr-placeholder {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 12px;
}

.qr-placeholder p {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border, #e5e7eb);
  border-top-color: var(--primary, #4f6ef7);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.qr-code {
  display: inline-block;
}

.qr-code canvas {
  border-radius: 8px;
  border: 1px solid var(--border, #e5e7eb);
}

.qr-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

/* Info Row */
.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 8px;
  font-size: 13px;
}

.info-label {
  color: var(--text-secondary, #6b7280);
  white-space: nowrap;
}

.info-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary, #1a1a1a);
}

.copy-btn {
  padding: 4px 10px;
  border: 1px solid var(--primary, #4f6ef7);
  background: transparent;
  color: var(--primary, #4f6ef7);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.copy-btn:hover {
  background: var(--primary, #4f6ef7);
  color: white;
}

/* Connect Info */
.connect-info {
  margin-bottom: 16px;
}

/* Tunnel Section */
.tunnel-section {
  padding: 16px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 12px;
  margin-bottom: 16px;
}

.tunnel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.tunnel-title {
  font-size: 14px;
  font-weight: 600;
}

.tunnel-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.tunnel-badge.stopped {
  background: #e5e7eb;
  color: #6b7280;
}

.tunnel-badge.starting {
  background: #fef3c7;
  color: #d97706;
}

.tunnel-badge.running {
  background: #d1fae5;
  color: #059669;
}

.tunnel-badge.error {
  background: #fee2e2;
  color: #dc2626;
}

.tunnel-desc {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 12px;
  line-height: 1.5;
}

.tunnel-actions {
  margin-bottom: 12px;
}

.tunnel-btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--primary, #4f6ef7);
  color: white;
  transition: all 0.15s;
}

.tunnel-btn:hover {
  background: var(--primary-hover, #3b5de7);
}

.tunnel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tunnel-btn.stop {
  background: #ef4444;
}

.tunnel-btn.stop:hover {
  background: #dc2626;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

.tunnel-url {
  margin-top: 8px;
}

/* Tips */
.tips-section {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
}

.tips-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  margin-bottom: 8px;
}

.tips-section ul {
  list-style: none;
  padding: 0;
}

.tips-section li {
  padding: 4px 0;
  padding-left: 16px;
  position: relative;
  line-height: 1.5;
}

.tips-section li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--primary, #4f6ef7);
}
</style>
