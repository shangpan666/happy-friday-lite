<template>
  <div class="mobile-app" :class="{ 'dark': isDark }">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span class="app-logo">P</span>
        <span class="app-name">Phronesis</span>
      </div>
      <div class="status-right">
        <button class="icon-btn" @click="toggleDark" :title="isDark ? '浅色模式' : '深色模式'">
          <svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button class="icon-btn" @click="showSearch = !showSearch" title="搜索">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div v-if="showSearch" class="search-bar">
      <input
        v-model="searchQuery"
        class="search-input"
        placeholder="搜索对话或笔记..."
        @input="handleSearch"
        ref="searchInput"
      />
      <button v-if="searchQuery" class="search-clear" @click="clearSearch">✕</button>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 首页/对话列表 -->
      <div v-if="currentView === 'home'" class="view-container">
        <div class="greeting-section">
          <h1 class="greeting">{{ getGreeting() }}</h1>
          <p class="greeting-sub">有什么我可以帮你的？</p>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <button class="quick-btn" @click="startNewChat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>新对话</span>
          </button>
          <button class="quick-btn" @click="currentView = 'notes'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>笔记</span>
          </button>
          <button class="quick-btn" @click="showVoiceInput">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            <span>语音</span>
          </button>
          <button class="quick-btn" @click="currentView = 'settings'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>设置</span>
          </button>
        </div>

        <!-- 最近对话 -->
        <div class="section-header">
          <h2>最近对话</h2>
          <button v-if="sessions.length > 0" class="see-all" @click="currentView = 'sessions'">查看全部</button>
        </div>
        <div class="session-list" v-if="sessions.length > 0">
          <div
            v-for="session in sessions.slice(0, 5)"
            :key="session.id"
            class="session-item"
            @click="openSession(session.id)"
          >
            <div class="session-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div class="session-info">
              <div class="session-title">{{ session.title }}</div>
              <div class="session-time">{{ formatTime(session.updatedAt) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无对话记录</p>
          <button class="primary-btn" @click="startNewChat">开始新对话</button>
        </div>

        <!-- 最近笔记 -->
        <div class="section-header" v-if="notes.length > 0">
          <h2>最近笔记</h2>
          <button class="see-all" @click="currentView = 'notes'">查看全部</button>
        </div>
        <div class="note-list" v-if="notes.length > 0">
          <div
            v-for="note in notes.slice(0, 3)"
            :key="note.id"
            class="note-item"
            @click="openNote(note.id)"
          >
            <div class="note-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="note-info">
              <div class="note-title">{{ note.title }}</div>
              <div class="note-time">{{ formatTime(note.updatedAt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 会话列表 -->
      <div v-if="currentView === 'sessions'" class="view-container">
        <div class="view-header">
          <button class="back-btn" @click="currentView = 'home'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h2>所有对话</h2>
          <div style="width: 32px;"></div>
        </div>
        <div class="session-list full">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="session-item"
            @click="openSession(session.id)"
          >
            <div class="session-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div class="session-info">
              <div class="session-title">{{ session.title }}</div>
              <div class="session-time">{{ formatTime(session.updatedAt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 对话详情 -->
      <div v-if="currentView === 'chat'" class="view-container chat-view">
        <div class="chat-header">
          <button class="back-btn" @click="currentView = previousView || 'home'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h2 class="chat-title">{{ currentSession?.title || '对话' }}</h2>
          <button class="icon-btn" @click="shareSession">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
        </div>
        <div class="messages-container" ref="messagesContainer">
          <div v-if="loadingMessages" class="loading-indicator">
            <div class="spinner"></div>
          </div>
          <div v-else class="messages-list">
            <div
              v-for="(msg, idx) in messages"
              :key="idx"
              class="message"
              :class="msg.role"
            >
              <div class="message-avatar">
                <template v-if="msg.role === 'user'">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </template>
                <template v-else>
                  <span class="ai-avatar">P</span>
                </template>
              </div>
              <div class="message-content">
                <div class="message-text" v-html="renderMarkdown(msg.content)"></div>
                <div class="message-time">{{ formatTime(msg.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 笔记列表 -->
      <div v-if="currentView === 'notes'" class="view-container">
        <div class="view-header">
          <button class="back-btn" @click="currentView = 'home'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h2>笔记</h2>
          <div style="width: 32px;"></div>
        </div>
        <div class="note-list full" v-if="notes.length > 0">
          <div
            v-for="note in notes"
            :key="note.id"
            class="note-item"
            @click="openNote(note.id)"
          >
            <div class="note-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="note-info">
              <div class="note-title">{{ note.title }}</div>
              <div class="note-time">{{ formatTime(note.updatedAt) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无笔记</p>
        </div>
      </div>

      <!-- 笔记详情 -->
      <div v-if="currentView === 'note-detail'" class="view-container">
        <div class="view-header">
          <button class="back-btn" @click="currentView = 'notes'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h2 class="note-detail-title">{{ currentNote?.title || '笔记' }}</h2>
          <button class="icon-btn" @click="shareNote">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
        </div>
        <div class="note-detail-content" v-if="currentNote" v-html="renderMarkdown(currentNote.content || currentNote.contentText || '')"></div>
      </div>

      <!-- 设置页 -->
      <div v-if="currentView === 'settings'" class="view-container">
        <div class="view-header">
          <button class="back-btn" @click="currentView = 'home'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h2>设置</h2>
          <div style="width: 32px;"></div>
        </div>
        <div class="settings-list">
          <div class="setting-group">
            <div class="setting-label">外观</div>
            <div class="setting-item" @click="toggleDark">
              <span>{{ isDark ? '深色模式' : '浅色模式' }}</span>
              <div class="toggle" :class="{ active: isDark }">
                <div class="toggle-thumb"></div>
              </div>
            </div>
          </div>
          <div class="setting-group">
            <div class="setting-label">连接</div>
            <div class="setting-item">
              <span>电脑端地址</span>
              <span class="setting-value">{{ baseUrl }}</span>
            </div>
            <div class="setting-item" @click="refreshData">
              <span>刷新数据</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </div>
          </div>
          <div class="setting-group">
            <div class="setting-label">关于</div>
            <div class="setting-item">
              <span>版本</span>
              <span class="setting-value">2.1.8</span>
            </div>
            <div class="setting-item">
              <span>Powered by Phronesis Lite</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航栏 -->
    <div class="bottom-nav" v-if="!currentView.includes('chat') && currentView !== 'note-detail'">
      <button class="nav-item" :class="{ active: currentView === 'home' }" @click="currentView = 'home'">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>首页</span>
      </button>
      <button class="nav-item" :class="{ active: currentView === 'sessions' }" @click="currentView = 'sessions'">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>对话</span>
      </button>
      <button class="nav-item center-action" @click="startNewChat">
        <div class="center-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
      </button>
      <button class="nav-item" :class="{ active: currentView === 'notes' }" @click="currentView = 'notes'">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span>笔记</span>
      </button>
      <button class="nav-item" :class="{ active: currentView === 'settings' }" @click="currentView = 'settings'">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span>设置</span>
      </button>
    </div>

    <!-- 语音输入弹窗 -->
    <div v-if="showVoiceModal" class="voice-modal" @click.self="showVoiceModal = false">
      <div class="voice-content">
        <div class="voice-visual" :class="{ recording: isRecording }">
          <div class="voice-ring ring1"></div>
          <div class="voice-ring ring2"></div>
          <div class="voice-ring ring3"></div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </div>
        <p class="voice-status">{{ isRecording ? '正在聆听...' : '点击开始录音' }}</p>
        <p class="voice-text" v-if="voiceText">{{ voiceText }}</p>
        <div class="voice-actions">
          <button class="voice-btn cancel" @click="showVoiceModal = false">取消</button>
          <button class="voice-btn confirm" @click="toggleRecording">
            {{ isRecording ? '停止' : '开始' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <div v-if="toast" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'MobileHome',
  data() {
    return {
      currentView: 'home',
      previousView: null,
      isDark: localStorage.getItem('mobile-dark') === 'true',
      showSearch: false,
      searchQuery: '',
      sessions: [],
      notes: [],
      currentSession: null,
      currentNote: null,
      messages: [],
      loadingMessages: false,
      showVoiceModal: false,
      isRecording: false,
      voiceText: '',
      toast: null,
      baseUrl: '',
      recognition: null,
    }
  },
  async mounted() {
    this.detectBaseUrl()
    await this.loadData()
    this.initSpeechRecognition()
  },
  watch: {
    isDark(val) {
      localStorage.setItem('mobile-dark', val)
    }
  },
  methods: {
    detectBaseUrl() {
      const loc = window.location
      this.baseUrl = `${loc.protocol}//${loc.host}`
    },
    async loadData() {
      try {
        const [sessionsRes, notesRes] = await Promise.all([
          fetch(`${this.baseUrl}/api/mobile/sessions`),
          fetch(`${this.baseUrl}/api/mobile/notes`)
        ])
        const sessionsData = await sessionsRes.json()
        const notesData = await notesRes.json()
        if (sessionsData.success) this.sessions = sessionsData.sessions
        if (notesData.success) this.notes = notesData.notes
      } catch (e) {
        console.error('Failed to load data:', e)
        this.showToast('加载数据失败', 'error')
      }
    },
    async openSession(sessionId) {
      this.previousView = this.currentView
      this.currentView = 'chat'
      this.loadingMessages = true
      try {
        const res = await fetch(`${this.baseUrl}/api/mobile/session/${encodeURIComponent(sessionId)}`)
        const data = await res.json()
        if (data.success) {
          this.currentSession = data.session
          this.messages = data.messages || []
          this.$nextTick(() => this.scrollToBottom())
        }
      } catch (e) {
        console.error('Failed to load session:', e)
        this.showToast('加载对话失败', 'error')
      } finally {
        this.loadingMessages = false
      }
    },
    async openNote(noteId) {
      this.previousView = this.currentView
      this.currentView = 'note-detail'
      try {
        const res = await fetch(`${this.baseUrl}/api/mobile/note/${encodeURIComponent(noteId)}`)
        const data = await res.json()
        if (data.success) {
          this.currentNote = data.note
        }
      } catch (e) {
        console.error('Failed to load note:', e)
        this.showToast('加载笔记失败', 'error')
      }
    },
    startNewChat() {
      this.showToast('请在电脑端开始新对话', 'info')
    },
    shareSession() {
      if (this.currentSession) {
        const url = `${this.baseUrl}/#/share/${this.currentSession.id}`
        this.copyToClipboard(url)
        this.showToast('分享链接已复制', 'success')
      }
    },
    shareNote() {
      if (this.currentNote) {
        const url = `${this.baseUrl}/#/share/note/${this.currentNote.id}`
        this.copyToClipboard(url)
        this.showToast('分享链接已复制', 'success')
      }
    },
    async handleSearch() {
      if (!this.searchQuery.trim()) {
        await this.loadData()
        return
      }
      try {
        const res = await fetch(`${this.baseUrl}/api/mobile/notes/search?q=${encodeURIComponent(this.searchQuery)}`)
        const data = await res.json()
        if (data.success) {
          this.notes = data.notes
        }
      } catch (e) {
        console.error('Search failed:', e)
      }
    },
    clearSearch() {
      this.searchQuery = ''
      this.showSearch = false
      this.loadData()
    },
    async refreshData() {
      await this.loadData()
      this.showToast('数据已刷新', 'success')
    },
    toggleDark() {
      this.isDark = !this.isDark
    },
    getGreeting() {
      const hour = new Date().getHours()
      if (hour < 6) return '夜深了'
      if (hour < 12) return '早上好'
      if (hour < 14) return '中午好'
      if (hour < 18) return '下午好'
      return '晚上好'
    },
    formatTime(isoStr) {
      if (!isoStr) return ''
      const date = new Date(isoStr)
      const now = new Date()
      const diff = now - date
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
      if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
      return date.toLocaleDateString('zh-CN')
    },
    renderMarkdown(text) {
      if (!text) return ''
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
    },
    scrollToBottom() {
      const container = this.$refs.messagesContainer
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    },
    showVoiceInput() {
      this.showVoiceModal = true
    },
    initSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.recognition.lang = 'zh-CN'
        this.recognition.continuous = false
        this.recognition.interimResults = true
        this.recognition.onresult = (event) => {
          const result = event.results[event.results.length - 1]
          this.voiceText = result[0].transcript
          if (result.isFinal) {
            this.isRecording = false
          }
        }
        this.recognition.onend = () => {
          this.isRecording = false
        }
        this.recognition.onerror = () => {
          this.isRecording = false
        }
      }
    },
    toggleRecording() {
      if (!this.recognition) {
        this.showToast('浏览器不支持语音识别', 'error')
        return
      }
      if (this.isRecording) {
        this.recognition.stop()
        this.isRecording = false
      } else {
        this.voiceText = ''
        this.recognition.start()
        this.isRecording = true
      }
    },
    copyToClipboard(text) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
      } else {
        const el = document.createElement('textarea')
        el.value = text
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
    },
    showToast(message, type = 'info') {
      this.toast = { message, type }
      setTimeout(() => { this.toast = null }, 2500)
    }
  }
}
</script>

<style scoped>
/* ===== CSS Variables ===== */
.mobile-app {
  --bg: #f7f8fa;
  --bg-card: #ffffff;
  --bg-input: #f0f1f3;
  --text: #1a1a1a;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border: #e5e7eb;
  --primary: #4f6ef7;
  --primary-light: #eef1fe;
  --primary-dark: #3b5de7;
  --user-bubble: #4f6ef7;
  --user-text: #ffffff;
  --ai-bubble: #ffffff;
  --ai-text: #1a1a1a;
  --shadow: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 12px rgba(0,0,0,0.08);
  --radius: 12px;
  --radius-sm: 8px;
  --nav-height: 60px;
  --status-height: 52px;
}

.mobile-app.dark {
  --bg: #0f0f0f;
  --bg-card: #1a1a1a;
  --bg-input: #262626;
  --text: #e5e5e5;
  --text-secondary: #a3a3a3;
  --text-muted: #737373;
  --border: #333333;
  --primary: #6b8aff;
  --primary-light: #1a2340;
  --primary-dark: #8da4ff;
  --user-bubble: #6b8aff;
  --user-text: #ffffff;
  --ai-bubble: #1a1a1a;
  --ai-text: #e5e5e5;
  --shadow: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg: 0 4px 12px rgba(0,0,0,0.4);
}

/* ===== Reset & Base ===== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.mobile-app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: var(--bg);
  color: var(--text);
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* ===== Status Bar ===== */
.status-bar {
  height: var(--status-height);
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  z-index: 10;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-logo {
  width: 28px;
  height: 28px;
  background: var(--primary);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.app-name {
  font-weight: 600;
  font-size: 16px;
}

.status-right {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.icon-btn:active {
  background: var(--bg-input);
}

/* ===== Search Bar ===== */
.search-bar {
  padding: 8px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0 40px 0 16px;
  font-size: 14px;
  background: var(--bg-input);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--primary);
}

.search-clear {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: var(--text-muted);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-bar {
  position: relative;
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--nav-height);
}

.view-container {
  min-height: 100%;
}

/* ===== Greeting ===== */
.greeting-section {
  padding: 24px 20px 16px;
}

.greeting {
  font-size: 24px;
  font-weight: 700;
}

.greeting-sub {
  color: var(--text-secondary);
  margin-top: 4px;
  font-size: 15px;
}

/* ===== Quick Actions ===== */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 8px 20px 20px;
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: var(--shadow);
}

.quick-btn:active {
  transform: scale(0.95);
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.quick-btn svg {
  color: var(--primary);
}

/* ===== Section Header ===== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.see-all {
  border: none;
  background: transparent;
  color: var(--primary);
  font-size: 13px;
  cursor: pointer;
}

/* ===== Session List ===== */
.session-list {
  padding: 0 20px;
}

.session-list.full {
  padding-top: 8px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-card);
  border-radius: var(--radius);
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.15s;
  box-shadow: var(--shadow);
}

.session-item:active {
  background: var(--primary-light);
}

.session-icon {
  width: 36px;
  height: 36px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ===== Note List ===== */
.note-list {
  padding: 0 20px;
}

.note-list.full {
  padding-top: 8px;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-card);
  border-radius: var(--radius);
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.15s;
  box-shadow: var(--shadow);
}

.note-item:active {
  background: var(--primary-light);
}

.note-icon {
  width: 36px;
  height: 36px;
  background: #fef3c7;
  color: #d97706;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dark .note-icon {
  background: #422006;
  color: #fbbf24;
}

.note-info {
  flex: 1;
  min-width: 0;
}

.note-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.empty-state p {
  margin-bottom: 16px;
}

.primary-btn {
  padding: 10px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.primary-btn:active {
  background: var(--primary-dark);
}

/* ===== View Header ===== */
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 5;
}

.view-header h2 {
  font-size: 17px;
  font-weight: 600;
}

.back-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn:active {
  background: var(--bg-input);
}

/* ===== Chat View ===== */
.chat-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--status-height));
  height: calc(100dvh - var(--status-height));
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.chat-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 10px;
  max-width: 88%;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-input);
  color: var(--text-secondary);
}

.message.user .message-avatar {
  background: var(--primary);
  color: white;
}

.ai-avatar {
  font-weight: 700;
  font-size: 13px;
  color: var(--primary);
}

.message-content {
  background: var(--ai-bubble);
  padding: 10px 14px;
  border-radius: 16px;
  border-top-left-radius: 4px;
  box-shadow: var(--shadow);
}

.message.user .message-content {
  background: var(--user-bubble);
  color: var(--user-text);
  border-top-left-radius: 16px;
  border-top-right-radius: 4px;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-text :deep(pre) {
  background: var(--bg-input);
  padding: 10px 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 13px;
}

.message-text :deep(code) {
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 13px;
}

.message-text :deep(p) {
  margin: 4px 0;
}

.message-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.message.user .message-time {
  color: rgba(255,255,255,0.6);
}

/* ===== Note Detail ===== */
.note-detail-content {
  padding: 20px;
  font-size: 15px;
  line-height: 1.8;
}

.note-detail-content :deep(pre) {
  background: var(--bg-input);
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
  font-size: 13px;
}

.note-detail-content :deep(code) {
  font-family: 'SF Mono', Menlo, Monaco, monospace;
}

.note-detail-title {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Settings ===== */
.settings-list {
  padding: 12px 20px;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px 8px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: var(--radius);
  margin-bottom: 2px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s;
}

.setting-item:first-of-type {
  border-radius: var(--radius) var(--radius) 2px 2px;
}

.setting-item:last-of-type {
  border-radius: 2px 2px var(--radius) var(--radius);
  margin-bottom: 0;
}

.setting-item:only-of-type {
  border-radius: var(--radius);
}

.setting-item:active {
  background: var(--primary-light);
}

.setting-value {
  color: var(--text-muted);
  font-size: 13px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle {
  width: 44px;
  height: 24px;
  background: var(--border);
  border-radius: 12px;
  position: relative;
  transition: background 0.2s;
}

.toggle.active {
  background: var(--primary);
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle.active .toggle-thumb {
  transform: translateX(20px);
}

/* ===== Bottom Nav ===== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom, 0);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
  cursor: pointer;
  transition: color 0.15s;
  min-width: 48px;
}

.nav-item.active {
  color: var(--primary);
}

.center-action {
  position: relative;
  top: -12px;
}

.center-btn {
  width: 48px;
  height: 48px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(79, 110, 247, 0.4);
  transition: transform 0.15s;
}

.center-action:active .center-btn {
  transform: scale(0.92);
}

/* ===== Voice Modal ===== */
.voice-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.voice-content {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  width: 280px;
  box-shadow: var(--shadow-lg);
}

.voice-visual {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.voice-ring {
  position: absolute;
  border: 2px solid var(--primary);
  border-radius: 50%;
  opacity: 0;
}

.voice-visual.recording .ring1 {
  animation: pulse 1.5s ease-out infinite;
}

.voice-visual.recording .ring2 {
  animation: pulse 1.5s ease-out infinite 0.3s;
}

.voice-visual.recording .ring3 {
  animation: pulse 1.5s ease-out infinite 0.6s;
}

@keyframes pulse {
  0% { width: 40px; height: 40px; opacity: 0.6; }
  100% { width: 100px; height: 100px; opacity: 0; }
}

.voice-status {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 8px;
}

.voice-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  min-height: 20px;
}

.voice-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.voice-btn {
  padding: 10px 28px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.voice-btn.cancel {
  background: var(--bg-input);
  color: var(--text-secondary);
}

.voice-btn.confirm {
  background: var(--primary);
  color: white;
}

.voice-btn:active {
  transform: scale(0.95);
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  z-index: 300;
  animation: toastIn 0.3s ease, toastOut 0.3s ease 2.2s;
  box-shadow: var(--shadow-lg);
}

.toast.info {
  background: var(--bg-card);
  color: var(--text);
  border: 1px solid var(--border);
}

.toast.success {
  background: #10b981;
  color: white;
}

.toast.error {
  background: #ef4444;
  color: white;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes toastOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* ===== Responsive ===== */
@media (min-width: 768px) {
  .mobile-app {
    max-width: 430px;
    margin: 0 auto;
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
  }
}
</style>
