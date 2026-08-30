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
        <div class="qr-login-section">
          <div class="qr-login-desc">
            用手机相机扫描下方二维码，点击链接即可自动登录 App。
          </div>
          <div v-if="qrLoginData" style="text-align: center;">
            <canvas ref="qrLoginCanvas" width="200" height="200" style="border-radius: 8px;"></canvas>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
              服务器: {{ qrLoginData.server }}<br>
              二维码 60 秒后过期，请刷新
            </div>
            <button class="action-btn" style="margin-top: 8px;" @click="generateQrLogin">刷新二维码</button>
          </div>
          <div v-else style="text-align: center;">
            <button class="action-btn" @click="generateQrLogin">生成登录二维码</button>
          </div>
        </div>

        <div class="tips-section">
          <h4>使用说明</h4>
          <ul>
            <li>1. 打开手机「相机」应用</li>
            <li>2. 对准上方二维码</li>
            <li>3. 点击屏幕上的链接</li>
            <li>4. 自动跳转完成登录</li>
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
      qrLoginData: null,
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.generateQrLogin()
      } else {
        this.qrLoginData = null
      }
    }
  },
  methods: {
    async generateQrLogin() {
      if (!window.electronAPI) return
      try {
        const data = await window.electronAPI.invoke('mobile-get-qr-login-data')
        if (!data || !data.qrToken) {
          alert('生成二维码失败，请先登录或检查服务状态')
          return
        }
        this.qrLoginData = data
        await this.$nextTick()
        if (this.$refs.qrLoginCanvas) {
          const qrUrl = `${data.server}/mobile/qr-login?qrToken=${data.qrToken}`
          const QRCode = await this.loadQRCodeLib()
          if (QRCode) {
            await QRCode.toCanvas(this.$refs.qrLoginCanvas, qrUrl, {
              width: 200,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' }
            })
          }
        }
      } catch (e) {
        console.error('QR login generation failed:', e)
      }
    },
    async loadQRCodeLib() {
      try {
        const mod = await import('qrcode')
        return mod.default || mod
      } catch (_e) {
        return new Promise((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
          script.onload = () => resolve(window.QRCode)
          script.onerror = () => resolve(null)
          document.head.appendChild(script)
        })
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
  width: 340px;
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

.qr-login-section {
  margin-bottom: 16px;
}

.qr-login-desc {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  margin-bottom: 12px;
  text-align: center;
  line-height: 1.5;
}

.qr-login-section canvas {
  border-radius: 8px;
  border: 1px solid var(--border, #e5e7eb);
}

.action-btn {
  padding: 6px 16px;
  border: 1px solid var(--primary, #4f6ef7);
  background: transparent;
  color: var(--primary, #4f6ef7);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--primary, #4f6ef7);
  color: white;
}

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
  line-height: 1.5;
}
</style>
