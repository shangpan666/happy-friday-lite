<template>
  <div class="account-wrap">
    <!-- 未登录 -->
    <div v-if="!connection.isConnected" class="login-panel">
      <div class="login-header">
        <div class="logo-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        </div>
        <h1 class="app-title">Happy Friday</h1>
      </div>

      <div class="form-area">
        <div class="input-group">
          <label>服务器地址</label>
          <input
            v-model="serverUrlInput"
            placeholder="http://127.0.0.1:17918"
            @keyup.enter="doLogin"
          />
          <span class="field-hint">本机填 127.0.0.1:17918，多机共享填中央机 IP</span>
        </div>

        <div class="input-group">
          <label>账号</label>
          <input v-model="username" placeholder="请输入用户名" @keyup.enter="doLogin" />
        </div>
        <div class="input-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码" @keyup.enter="doLogin" />
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <button class="login-btn" :disabled="busy" @click="doLogin">
          {{ busy ? '登录中...' : '登 录' }}
        </button>
      </div>

      <div class="login-footer">
        <span class="footer-text">Happy Friday v{{ appVersion }}</span>
      </div>
    </div>

    <!-- 已登录 -->
    <div v-else class="account-card">
      <div class="profile">
        <div class="avatar">{{ initial }}</div>
        <div class="profile-meta">
          <div class="profile-name">
            {{ connection.user?.username }}
            <span class="role-badge">{{ roleText }}</span>
          </div>
          <div class="conn-line">
            <span class="dot" :class="{ central: connection.isCentral }"></span>
            {{ connection.serverUrl }} · {{ connection.isCentral ? '中央机' : '本机' }}
          </div>
        </div>
        <button class="btn-ghost" @click="doLogout">退出</button>
      </div>

      <div v-if="successMsg" class="ok">{{ successMsg }}</div>

      <div class="section">
        <button class="section-title" @click="showPwd = !showPwd">
          <span>修改密码</span>
          <svg class="chev" :class="{ open: showPwd }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div v-if="showPwd" class="section-body">
          <div class="field">
            <label>旧密码</label>
            <input v-model="oldPwd" type="password" />
          </div>
          <div class="field">
            <label>新密码</label>
            <input v-model="newPwd" type="password" />
          </div>
          <div class="field">
            <label>确认新密码</label>
            <input v-model="newPwd2" type="password" />
          </div>
          <div v-if="pwdMsg" class="error">{{ pwdMsg }}</div>
          <button class="btn-primary sm" :disabled="busy" @click="doChangePwd">
            {{ busy ? '提交中...' : '修改密码' }}
          </button>
        </div>
      </div>

      <div v-if="isAdmin" class="section">
        <button class="section-title" @click="showCreate = !showCreate">
          <span>创建账号</span>
          <svg class="chev" :class="{ open: showCreate }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div v-if="showCreate" class="section-body">
          <div class="field">
            <label>用户名</label>
            <input v-model="newUser" placeholder="员工账号名" />
          </div>
          <div class="field">
            <label>密码</label>
            <input v-model="newPass" type="password" />
          </div>
          <div class="field">
            <label>角色</label>
            <div class="radio-row">
              <label class="radio"><input type="radio" value="admin" v-model="newRole" /> 管理员</label>
              <label class="radio"><input type="radio" value="user" v-model="newRole" /> 员工</label>
            </div>
          </div>
          <div v-if="userMsg" class="error">{{ userMsg }}</div>
          <button class="btn-primary sm" :disabled="busy" @click="doRegister">
            {{ busy ? '创建中...' : '创建账号' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useConnectionStore } from '../../store/modules/connection'
import { electronService } from '@/services/electron'
import packageJson from '../../../package.json'

const connection = useConnectionStore()
const { serverUrl } = storeToRefs(connection)

const serverUrlInput = ref(serverUrl.value)
const username = ref('')
const password = ref('')
const busy = ref(false)
const errorMsg = ref('')
const appVersion = packageJson.version

const oldPwd = ref('')
const newPwd = ref('')
const newPwd2 = ref('')
const pwdMsg = ref('')
const showPwd = ref(false)

const newUser = ref('')
const newPass = ref('')
const newRole = ref('user')
const userMsg = ref('')
const showCreate = ref(false)
const successMsg = ref('')

const initial = computed(() => (connection.user?.username || '?').charAt(0).toUpperCase())
const roleText = computed(() => (connection.user?.role === 'admin' ? '管理员' : '员工'))
const isAdmin = computed(() => connection.user?.role === 'admin')

function handleAuthError(res) {
  const msg = (res && res.error) || ''
  if ((res && !res.success) && msg.includes('未授权')) {
    connection.logout()
    errorMsg.value = '登录已失效，请重新登录'
    return true
  }
  return false
}

async function doLogin() {
  errorMsg.value = ''
  if (!serverUrlInput.value || !username.value || !password.value) {
    errorMsg.value = '请填写服务器地址、用户名和密码'
    return
  }
  busy.value = true
  try {
    connection.setServer(serverUrlInput.value.trim())
    const res = await connection.login(username.value.trim(), password.value)
    if (!res || !res.success) {
      errorMsg.value = res?.error || '登录失败'
    } else {
      username.value = ''
      password.value = ''
      successMsg.value = ''
    }
  } finally {
    busy.value = false
  }
}

function doLogout() {
  connection.logout()
  successMsg.value = ''
}

async function doChangePwd() {
  pwdMsg.value = ''
  successMsg.value = ''
  if (!oldPwd.value || !newPwd.value) {
    pwdMsg.value = '请填写旧密码和新密码'
    return
  }
  if (newPwd.value !== newPwd2.value) {
    pwdMsg.value = '两次新密码不一致'
    return
  }
  busy.value = true
  try {
    const res = await electronService.invoke('account-change-password', {
      token: connection.token,
      oldPassword: oldPwd.value,
      newPassword: newPwd.value,
      base: connection.serverUrl
    })
    if (!res || !res.success) {
      if (handleAuthError(res)) return
      pwdMsg.value = res?.error || '修改失败'
    } else {
      pwdMsg.value = ''
      successMsg.value = '密码已修改'
      oldPwd.value = ''
      newPwd.value = ''
      newPwd2.value = ''
    }
  } finally {
    busy.value = false
  }
}

async function doRegister() {
  userMsg.value = ''
  successMsg.value = ''
  if (!newUser.value || !newPass.value) {
    userMsg.value = '请填写用户名和密码'
    return
  }
  busy.value = true
  try {
    const res = await electronService.invoke('account-register', {
      token: connection.token,
      username: newUser.value.trim(),
      password: newPass.value,
      role: newRole.value,
      base: connection.serverUrl
    })
    if (!res || !res.success) {
      if (handleAuthError(res)) return
      userMsg.value = res?.error || '创建失败'
    } else {
      userMsg.value = ''
      successMsg.value = '账号已创建'
      newUser.value = ''
      newPass.value = ''
    }
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
/* ===== 全局容器 ===== */
.account-wrap {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

/* ===== 登录面板 ===== */
.login-panel {
  width: 380px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.login-header {
  padding: 48px 0 24px;
  text-align: center;
  background: linear-gradient(135deg, #4a90d9 0%, #357abd 100%);
}

.logo-mark {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  letter-spacing: 0.5px;
}

.form-area {
  padding: 32px 36px 28px;
}

.input-group {
  margin-bottom: 18px;
}

.input-group label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.input-group input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-inset);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.input-group input::placeholder {
  color: var(--text-tertiary);
}

.input-group input:focus {
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
}

.field-hint {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
  line-height: 1.5;
}

.error-msg {
  padding: 10px 12px;
  margin-bottom: 16px;
  background: rgba(245, 108, 108, 0.1);
  border: 1px solid rgba(245, 108, 108, 0.2);
  border-radius: 4px;
  color: #f56c6c;
  font-size: 13px;
  text-align: center;
}

.login-btn {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 4px;
  background: #4a90d9;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  letter-spacing: 4px;
}

.login-btn:hover {
  background: #5a9ee6;
}

.login-btn:active {
  background: #357abd;
}

.login-btn:disabled {
  background: #4a6a8a;
  cursor: not-allowed;
  opacity: 0.6;
}

.login-footer {
  padding: 16px 0;
  text-align: center;
  border-top: 1px solid var(--border-color);
}

.footer-text {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ===== 已登录样式（保留原样） ===== */
.account-card {
  width: 420px;
  max-width: 100%;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 28px 26px;
  box-shadow: var(--shadow-md);
}

.profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 18px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: var(--accent-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
}

.profile-meta {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-badge {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 6px;
  background-color: var(--accent-light);
  color: var(--accent-color);
  font-weight: 500;
}

.conn-line {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-tertiary);
}

.dot.central {
  background-color: var(--online-color);
}

.btn-ghost {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}

.btn-ghost:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.section {
  margin-top: 20px;
}

.section-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  padding: 8px 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: color 0.12s;
}

.section-title:hover {
  color: var(--accent-color);
}

.chev {
  color: var(--text-tertiary);
  transition: transform 0.18s ease;
}

.chev.open {
  transform: rotate(180deg);
}

.section-body {
  margin-top: 8px;
}

.field {
  margin-bottom: 14px;
}

.field label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-inset);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.field input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.error {
  color: var(--danger-color);
  font-size: 13px;
  margin: 10px 0;
  text-align: center;
}

.ok {
  color: #22c55e;
  font-size: 13px;
  margin: 10px 0;
  text-align: center;
}

.btn-primary {
  width: 100%;
  padding: 11px;
  border: none;
  border-radius: 8px;
  background-color: var(--accent-color);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.15s, opacity 0.15s;
}

.btn-primary:hover {
  filter: brightness(1.05);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary.sm {
  width: auto;
  padding: 8px 18px;
  font-size: 14px;
}

.radio-row {
  display: flex;
  gap: 24px;
}

.radio {
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  cursor: pointer;
}

.radio input[type="radio"] {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-strong);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: border-color 0.15s;
}

.radio input[type="radio"]:checked {
  border-color: var(--accent-color);
}

.radio input[type="radio"]:checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-color);
}

.radio input[type="radio"]:focus-visible {
  outline: 2px solid var(--accent-light);
  outline-offset: 2px;
}
</style>
