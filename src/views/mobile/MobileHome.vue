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
          <button class="quick-btn" @click="openHarness">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span>Harness</span>
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
            v-for="session in sessions.slice(0, 3)"
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
           <span class="chat-model-badge" v-if="currentModelName">{{ formatModelName(currentModelName) }}</span>
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
             <div v-if="sending" class="message assistant">
               <div class="message-avatar"><span class="ai-avatar">P</span></div>
               <div class="message-content">
                 <div class="typing-indicator"><span></span><span></span><span></span></div>
               </div>
             </div>
           </div>
         </div>
         <div class="chat-input-bar">
           <textarea
             v-model="inputText"
             class="chat-input"
             :placeholder="inputPlaceholder"
             rows="1"
             @input="autoGrowInput"
             @keydown.enter.exact.prevent="sendMessage"
             ref="chatInput"
           ></textarea>
           <button class="send-btn" @click="sendMessage" :disabled="sending || !inputText.trim()">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <line x1="22" y1="2" x2="11" y2="13"></line>
               <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
             </svg>
           </button>
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

      <!-- DeepSeek Harness 视图 -->
      <div v-if="currentView === 'harness'" class="view-container harness-view">
        <div class="view-header">
          <button class="back-btn" @click="currentView = 'home'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h2>DeepSeek Harness</h2>
          <button class="icon-btn" @click="refreshHarnessStatus" :disabled="harnessLoading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>
        </div>
        
        <div class="harness-content">
          <!-- 加载状态 -->
          <div v-if="harnessLoading" class="harness-state">
            <div class="spinner"></div>
            <p>正在连接 Harness...</p>
          </div>
          
          <!-- 就绪状态 - 显示 iframe 通过代理 -->
          <iframe
            v-else-if="harnessStatus.status === 'ready' && harnessStatus.proxyUrl"
            :src="harnessStatus.proxyUrl"
            class="harness-frame"
            allow="clipboard-read; clipboard-write"
          ></iframe>
          
          <!-- 启动中状态 -->
          <div v-else-if="harnessStatus.status === 'starting' || harnessStatus.status === 'idle'" class="harness-state">
            <div class="spinner"></div>
            <p>正在启动 Harness...</p>
            <p v-if="harnessStatus.recentOutput && harnessStatus.recentOutput.length" class="harness-log">
              {{ harnessStatus.recentOutput.slice(-3).join('\n') }}
            </p>
            <button class="action-btn" @click="startHarness" :disabled="harnessLoading">
              重试启动
            </button>
          </div>
          
          <!-- 需要配置 -->
          <div v-else-if="harnessStatus.status === 'config-required'" class="harness-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <h3>需要配置模型</h3>
            <p>请先在桌面端设置中配置 DeepSeek 模型</p>
            <button class="action-btn" @click="currentView = 'settings'">
              前往设置
            </button>
          </div>
          
          <!-- 错误状态 -->
          <div v-else class="harness-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>启动失败</h3>
            <p class="error-text">{{ harnessStatus.error || '未知错误' }}</p>
            <button class="action-btn" @click="restartHarness">
              重新启动
            </button>
          </div>
        </div>
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
            <div class="setting-item">
              <span>当前模型</span>
              <span class="setting-value">{{ currentModelName || '未配置' }}</span>
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
      models: [],
      selectedModelId: null,
      currentModelName: '',
      inputText: '',
      sending: false,
      mobileSessionId: localStorage.getItem('mobile-session-id') || '',
      harnessStatus: {
        status: 'idle',
        url: null,
        port: null,
        model: null,
        toolCount: 0,
        error: null
      },
      harnessLoading: false,
      harnessPollingTimer: null,
    }
  },
  computed: {
    inputPlaceholder() {
      return '欢迎使用 Phronesis'
    }
  },
  async mounted() {
    this.detectBaseUrl()
    await this.fetchModels()
    await this.loadData()
    this.initSpeechRecognition()
  },
  beforeUnmount() {
    this.stopHarnessPolling()
  },
  watch: {
    isDark(val) {
      localStorage.setItem('mobile-dark', val)
    }
  },
  methods: {
    formatModelName(name) {
      if (!name) return ''
      const parts = name.split('/')
      return parts.length > 1 ? parts[1] : name
    },
    detectBaseUrl() {
      const loc = window.location
      this.baseUrl = `${loc.protocol}//${loc.host}`
    },
    openHarness() {
      this.currentView = 'harness'
      this.fetchHarnessStatus().then(() => {
        // 如果状态是启动中，开始轮询
        if (this.harnessStatus.status === 'starting' || this.harnessStatus.status === 'idle') {
          this.startHarnessPolling()
        }
      })
    },
    async fetchHarnessStatus() {
      this.harnessLoading = true
      try {
        const res = await fetch(`${this.baseUrl}/api/mobile/harness/status`)
        const data = await res.json()
        if (data.success) {
          this.harnessStatus = data.status
        }
      } catch (e) {
        console.error('Failed to fetch harness status:', e)
        this.harnessStatus.status = 'error'
        this.harnessStatus.error = e.message || '无法连接 Harness'
      } finally {
        this.harnessLoading = false
      }
    },
    async refreshHarnessStatus() {
      await this.fetchHarnessStatus()
    },
    async startHarness() {
      this.harnessLoading = true
      this.harnessStatus.status = 'starting'
      try {
        const res = await fetch(`${this.baseUrl}/api/mobile/harness/start`, { method: 'POST' })
        const data = await res.json()
        if (data.success) {
          this.harnessStatus = data.status
          // 如果仍在启动中，开始轮询状态
          if (this.harnessStatus.status === 'starting' || this.harnessStatus.status === 'idle') {
            this.startHarnessPolling()
          }
        } else {
          this.harnessStatus.status = 'error'
          this.harnessStatus.error = data.error
        }
      } catch (e) {
        console.error('Failed to start harness:', e)
        this.harnessStatus.status = 'error'
        this.harnessStatus.error = e.message || '启动 Harness 失败'
      } finally {
        this.harnessLoading = false
      }
    },
    async restartHarness() {
      this.harnessLoading = true
      this.harnessStatus.status = 'starting'
      try {
        const res = await fetch(`${this.baseUrl}/api/mobile/harness/restart`, { method: 'POST' })
        const data = await res.json()
        if (data.success) {
          this.harnessStatus = data.status
          // 如果仍在启动中，开始轮询状态
          if (this.harnessStatus.status === 'starting' || this.harnessStatus.status === 'idle') {
            this.startHarnessPolling()
          }
        } else {
          this.harnessStatus.status = 'error'
          this.harnessStatus.error = data.error
        }
      } catch (e) {
        console.error('Failed to restart harness:', e)
        this.harnessStatus.status = 'error'
        this.harnessStatus.error = e.message || '重启 Harness 失败'
      } finally {
        this.harnessLoading = false
      }
    },
    startHarnessPolling() {
      // 清除之前的轮询
      if (this.harnessPollingTimer) {
        clearInterval(this.harnessPollingTimer)
      }
      this.harnessPollingTimer = setInterval(async () => {
        try {
          const res = await fetch(`${this.baseUrl}/api/mobile/harness/status`)
          const data = await res.json()
          if (data.success) {
            this.harnessStatus = data.status
            // 如果状态不再是启动中，停止轮询
            if (this.harnessStatus.status !== 'starting' && this.harnessStatus.status !== 'idle') {
              this.stopHarnessPolling()
            }
          }
        } catch (e) {
          console.error('Failed to poll harness status:', e)
        }
      }, 2000) // 每2秒轮询一次
    },
    stopHarnessPolling() {
      if (this.harnessPollingTimer) {
        clearInterval(this.harnessPollingTimer)
        this.harnessPollingTimer = null
      }
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
      this.mobileSessionId = sessionId
      localStorage.setItem('mobile-session-id', sessionId)
      this.loadingMessages = true
      try {
        const res = await fetch(`${this.baseUrl}/api/mobile/session/${encodeURIComponent(sessionId)}`)
        const data = await res.json()
        if (data.success) {
          this.currentSession = data.session
          this.messages = (data.messages || []).map((m) => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt
          }))
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
    // 拉取桌面端模型列表（自动获取，从而能发起对话）
    async fetchModels() {
      try {
        const res = await fetch(`${this.baseUrl}/api/mobile/models`)
        const data = await res.json()
        if (data.success && data.models && data.models.length) {
          this.models = data.models
          this.selectedModelId = data.selectedModelId || data.models[0].id
          const sel = data.models.find((m) => m.id === this.selectedModelId) || data.models[0]
          this.currentModelName = sel.modelName || sel.name || ''
        }
      } catch (e) {
        console.error('Failed to load models:', e)
      }
    },
    // 开始新对话：生成一个新的手机端会话
    startNewChat() {
      this.mobileSessionId = 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      localStorage.setItem('mobile-session-id', this.mobileSessionId)
      this.currentSession = { title: '手机对话' }
      this.messages = []
      this.inputText = ''
      this.currentView = 'chat'
      this.$nextTick(() => {
        this.scrollToBottom()
        this.$refs.chatInput && this.$refs.chatInput.focus()
      })
    },
    autoGrowInput() {
      const el = this.$refs.chatInput
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    },
    async sendMessage() {
      const text = (this.inputText || '').trim()
      if (!text || this.sending) return
      if (!this.mobileSessionId) {
        this.startNewChat()
      }
      // 立即展示用户消息
      this.messages.push({ role: 'user', content: text, createdAt: new Date().toISOString() })
      this.inputText = ''
      this.autoGrowInput()
      this.sending = true
      this.$nextTick(() => this.scrollToBottom())
      try {
        const res = await fetch(`${this.baseUrl}/api/mobile/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.mobileSessionId,
            message: text,
            model: this.selectedModelId || undefined
          })
        })
        const data = await res.json()
        if (data.success) {
          if (data.sessionId) {
            this.mobileSessionId = data.sessionId
            localStorage.setItem('mobile-session-id', data.sessionId)
          }
          this.messages.push({ role: 'assistant', content: data.content, createdAt: new Date().toISOString() })
        } else {
          this.showToast(data.error || '对话失败', 'error')
        }
      } catch (e) {
        console.error('Chat failed:', e)
        this.showToast('网络错误，发送失败', 'error')
      } finally {
        this.sending = false
        this.$nextTick(() => this.scrollToBottom())
      }
    },
    shareSession() {
      const id = (this.currentSession && this.currentSession.id) || this.mobileSessionId
      if (id) {
        const url = `${this.baseUrl}/#/share/${encodeURIComponent(id)}`
        this.copyToClipboard(url)
        this.showToast('分享链接已复制', 'success')
      } else {
        this.showToast('暂无可分享的对话', 'info')
      }
    },
    shareNote() {
      if (this.currentNote && this.currentNote.id) {
        const url = `${this.baseUrl}/#/share/note/${encodeURIComponent(this.currentNote.id)}`
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
/* ===== Reset & Base ===== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.mobile-app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: var(--bg-secondary, #f6f7f9);
  color: var(--text-primary, #1f2328);
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  --nav-height: 60px;
  --status-height: 52px;
}

.mobile-app.dark {
  --bg-secondary: #141518;
  --bg-primary: #1c1d21;
  --bg-inset: #26282e;
  --text-primary: #d6dae0;
  --text-secondary: #8b949e;
  --text-tertiary: #59636e;
  --border-color: #2c2f35;
  --accent-color: #5c8ceb;
  --accent-light: rgba(92, 140, 235, 0.14);
}

/* ===== Status Bar ===== */
.status-bar {
  height: var(--status-height);
  background: var(--bg-primary, #ffffff);
  border-bottom: 1px solid var(--border-color, #e3e6ea);
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
  width: 26px;
  height: 26px;
  background: var(--text-primary, #1f2328);
  color: var(--bg-primary, #ffffff);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
}

.mobile-app.dark .app-logo {
  background: #d6dae0;
  color: #1c1d21;
}

.app-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary, #1f2328);
}

.status-right {
  display: flex;
  gap: 2px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #59636e);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.icon-btn:active {
  background: var(--bg-hover, rgba(31, 35, 40, 0.055));
}

/* ===== Search Bar ===== */
.search-bar {
  padding: 8px 16px;
  background: var(--bg-primary, #ffffff);
  border-bottom: 1px solid var(--border-color, #e3e6ea);
  flex-shrink: 0;
  position: relative;
}

.search-input {
  width: 100%;
  height: 36px;
  border: 1px solid var(--border-color, #e3e6ea);
  border-radius: 8px;
  padding: 0 36px 0 12px;
  font-size: 13px;
  background: var(--bg-secondary, #f6f7f9);
  color: var(--text-primary, #1f2328);
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--accent-color, #3574f0);
}

.search-clear {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: none;
  background: var(--text-tertiary, #8b949e);
  color: white;
  border-radius: 50%;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: 28px 20px 14px;
}

.greeting {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary, #1f2328);
}

.greeting-sub {
  color: var(--text-secondary, #59636e);
  margin-top: 4px;
  font-size: 14px;
}

/* ===== Quick Actions ===== */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 10px 20px 20px;
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px;
  background: var(--bg-primary, #ffffff);
  border: 1px solid var(--border-color, #e3e6ea);
  border-radius: 10px;
  color: var(--text-primary, #1f2328);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-btn:active {
  transform: scale(0.96);
  background: var(--bg-secondary, #f6f7f9);
}

.quick-btn svg {
  color: var(--text-secondary, #59636e);
}

.quick-btn:active svg {
  color: var(--accent-color, #3574f0);
}

/* ===== Section Header ===== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
}

.section-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1f2328);
}

.see-all {
  border: none;
  background: transparent;
  color: var(--accent-color, #3574f0);
  font-size: 12px;
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
  background: var(--bg-primary, #ffffff);
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid var(--border-color, #e3e6ea);
}

.session-item:active {
  background: var(--bg-secondary, #f6f7f9);
}

.session-icon {
  width: 32px;
  height: 32px;
  background: var(--bg-secondary, #f6f7f9);
  color: var(--text-secondary, #59636e);
  border-radius: 8px;
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
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary, #1f2328);
}

.session-time {
  font-size: 11px;
  color: var(--text-tertiary, #8b949e);
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
  background: var(--bg-primary, #ffffff);
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid var(--border-color, #e3e6ea);
}

.note-item:active {
  background: var(--bg-secondary, #f6f7f9);
}

.note-icon {
  width: 32px;
  height: 32px;
  background: var(--bg-secondary, #f6f7f9);
  color: var(--text-secondary, #59636e);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.note-info {
  flex: 1;
  min-width: 0;
}

.note-title {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary, #1f2328);
}

.note-time {
  font-size: 11px;
  color: var(--text-tertiary, #8b949e);
  margin-top: 2px;
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary, #8b949e);
}

.empty-state p {
  margin-bottom: 14px;
  font-size: 14px;
}

.primary-btn {
  padding: 9px 20px;
  background: var(--text-primary, #1f2328);
  color: var(--bg-primary, #ffffff);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.mobile-app.dark .primary-btn {
  background: #d6dae0;
  color: #1c1d21;
}

.primary-btn:active {
  opacity: 0.85;
}

/* ===== View Header ===== */
.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-primary, #ffffff);
  border-bottom: 1px solid var(--border-color, #e3e6ea);
  position: sticky;
  top: 0;
  z-index: 5;
}

.view-header h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #1f2328);
}

.back-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: var(--text-primary, #1f2328);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn:active {
  background: var(--bg-hover, rgba(31, 35, 40, 0.055));
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
  background: var(--bg-primary, #ffffff);
  border-bottom: 1px solid var(--border-color, #e3e6ea);
  flex-shrink: 0;
}

.chat-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 8px;
  color: var(--text-primary, #1f2328);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  -webkit-overflow-scrolling: touch;
  background: var(--bg-secondary, #f6f7f9);
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color, #e3e6ea);
  border-top-color: var(--text-secondary, #59636e);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.message {
  display: flex;
  gap: 8px;
  max-width: 85%;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-primary, #ffffff);
  color: var(--text-secondary, #59636e);
  border: 1px solid var(--border-color, #e3e6ea);
}

.message.user .message-avatar {
  background: var(--text-primary, #1f2328);
  color: var(--bg-primary, #ffffff);
  border: none;
}

.mobile-app.dark .message.user .message-avatar {
  background: #d6dae0;
  color: #1c1d21;
}

.ai-avatar {
  font-weight: 600;
  font-size: 12px;
  color: var(--text-secondary, #59636e);
}

.message-content {
  background: var(--bg-primary, #ffffff);
  padding: 10px 14px;
  border-radius: 14px;
  border-top-left-radius: 4px;
  border: 1px solid var(--border-color, #e3e6ea);
}

.message.user .message-content {
  background: var(--text-primary, #1f2328);
  color: var(--bg-primary, #ffffff);
  border-color: transparent;
  border-top-left-radius: 14px;
  border-top-right-radius: 4px;
}

.mobile-app.dark .message.user .message-content {
  background: #d6dae0;
  color: #1c1d21;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-text :deep(pre) {
  background: var(--bg-secondary, #f6f7f9);
  padding: 10px 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 6px 0;
  font-size: 12px;
  border: 1px solid var(--border-color, #e3e6ea);
}

.mobile-app.dark .message-text :deep(pre) {
  background: #26282e;
  border-color: #2c2f35;
}

.message-text :deep(code) {
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 12px;
}

.message-text :deep(p) {
  margin: 3px 0;
}

.message-time {
  font-size: 10px;
  color: var(--text-tertiary, #8b949e);
  margin-top: 3px;
}

.message.user .message-time {
  color: var(--text-tertiary, #8b949e);
}

.mobile-app.dark .message.user .message-time {
  color: #59636e;
}

/* ===== Chat Input Bar ===== */
.chat-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0));
  background: var(--bg-primary, #ffffff);
  border-top: 1px solid var(--border-color, #e3e6ea);
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  max-height: 100px;
  min-height: 38px;
  border: 1px solid var(--border-color, #e3e6ea);
  border-radius: 18px;
  padding: 9px 14px;
  font-size: 14px;
  line-height: 1.4;
  background: var(--bg-secondary, #f6f7f9);
  color: var(--text-primary, #1f2328);
  outline: none;
  resize: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.chat-input:focus {
  border-color: var(--accent-color, #3574f0);
}

.send-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: var(--text-primary, #1f2328);
  color: var(--bg-primary, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}

.mobile-app.dark .send-btn {
  background: #d6dae0;
  color: #1c1d21;
}

.send-btn:active {
  transform: scale(0.92);
}

.send-btn:disabled {
  background: var(--text-tertiary, #8b949e);
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-model-badge {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--text-secondary, #59636e);
  background: var(--bg-secondary, #f6f7f9);
  padding: 3px 7px;
  border-radius: 6px;
  max-width: 35vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid var(--border-color, #e3e6ea);
}

/* ===== Typing Indicator ===== */
.typing-indicator {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 2px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: var(--text-tertiary, #8b949e);
  border-radius: 50%;
  animation: typingBounce 1.2s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* ===== Note Detail ===== */
.note-detail-content {
  padding: 18px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary, #1f2328);
}

.note-detail-content :deep(pre) {
  background: var(--bg-secondary, #f6f7f9);
  padding: 10px 14px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 10px 0;
  font-size: 12px;
  border: 1px solid var(--border-color, #e3e6ea);
}

.note-detail-content :deep(code) {
  font-family: 'SF Mono', Menlo, Monaco, monospace;
}

.note-detail-title {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary, #1f2328);
}

/* ===== Harness ===== */
.harness-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.harness-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.harness-frame {
  display: block;
  width: 100%;
  flex: 1;
  min-height: 0;
  border: 0;
  background: #fff;
}

.harness-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--text-secondary, #656d76);
}

.harness-state svg {
  margin-bottom: 16px;
  color: var(--text-tertiary, #8b949e);
}

.harness-state h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1f2328);
}

.harness-state p {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.5;
}

.error-text {
  color: #cf222e;
  word-break: break-all;
  font-size: 12px;
}

.harness-log {
  font-size: 11px;
  color: var(--text-tertiary, #8b949e);
  background: var(--bg-secondary, #f6f8fa);
  padding: 8px;
  border-radius: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre-wrap;
  word-break: break-all;
  margin-bottom: 12px;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #d0d7de);
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #1f2328);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.action-btn:active {
  background: var(--bg-secondary, #f6f8fa);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color, #d0d7de);
  border-top-color: var(--text-primary, #1f2328);
  border-radius: 50%;
  animation: harness-spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes harness-spin {
  to { transform: rotate(360deg); }
}

/* ===== Settings ===== */
.settings-list {
  padding: 12px 16px;
}

.setting-group {
  margin-bottom: 16px;
}

.setting-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary, #8b949e);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px 6px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bg-primary, #ffffff);
  border-radius: 10px;
  margin-bottom: 1px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
  border: 1px solid var(--border-color, #e3e6ea);
}

.setting-item:active {
  background: var(--bg-secondary, #f6f7f9);
}

.setting-value {
  color: var(--text-tertiary, #8b949e);
  font-size: 12px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle {
  width: 40px;
  height: 22px;
  background: var(--border-color, #e3e6ea);
  border-radius: 11px;
  position: relative;
  transition: background 0.2s;
}

.toggle.active {
  background: var(--accent-color, #3574f0);
}

.toggle-thumb {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}

.toggle.active .toggle-thumb {
  transform: translateX(18px);
}

/* ===== Bottom Nav ===== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background: var(--bg-primary, #ffffff);
  border-top: 1px solid var(--border-color, #e3e6ea);
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
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--text-tertiary, #8b949e);
  font-size: 10px;
  cursor: pointer;
  transition: color 0.15s;
  min-width: 44px;
}

.nav-item.active {
  color: var(--text-primary, #1f2328);
}

.center-action {
  position: relative;
  top: -8px;
}

.center-btn {
  width: 42px;
  height: 42px;
  background: var(--text-primary, #1f2328);
  color: var(--bg-primary, #ffffff);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: transform 0.15s;
}

.mobile-app.dark .center-btn {
  background: #d6dae0;
  color: #1c1d21;
}

.center-action:active .center-btn {
  transform: scale(0.92);
}

/* ===== Voice Modal ===== */
.voice-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.voice-content {
  background: var(--bg-primary, #ffffff);
  border-radius: 16px;
  padding: 28px;
  text-align: center;
  width: 260px;
  box-shadow: var(--shadow-lg);
}

.voice-visual {
  width: 72px;
  height: 72px;
  margin: 0 auto 14px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #59636e);
}

.voice-ring {
  position: absolute;
  border: 1.5px solid var(--text-tertiary, #8b949e);
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
  0% { width: 36px; height: 36px; opacity: 0.5; }
  100% { width: 90px; height: 90px; opacity: 0; }
}

.voice-status {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text-primary, #1f2328);
}

.voice-text {
  font-size: 13px;
  color: var(--text-secondary, #59636e);
  margin-bottom: 14px;
  min-height: 18px;
}

.voice-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.voice-btn {
  padding: 9px 24px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.voice-btn.cancel {
  background: var(--bg-secondary, #f6f7f9);
  color: var(--text-secondary, #59636e);
  border: 1px solid var(--border-color, #e3e6ea);
}

.voice-btn.confirm {
  background: var(--text-primary, #1f2328);
  color: var(--bg-primary, #ffffff);
}

.mobile-app.dark .voice-btn.confirm {
  background: #d6dae0;
  color: #1c1d21;
}

.voice-btn:active {
  transform: scale(0.95);
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  z-index: 300;
  animation: toastIn 0.3s ease, toastOut 0.3s ease 2.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

.toast.info {
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #1f2328);
  border: 1px solid var(--border-color, #e3e6ea);
}

.toast.success {
  background: var(--success-color, #1a7f37);
  color: white;
}

.toast.error {
  background: var(--danger-color, #cf222e);
  color: white;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
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
    border-left: 1px solid var(--border-color, #e3e6ea);
    border-right: 1px solid var(--border-color, #e3e6ea);
  }
}
</style>
