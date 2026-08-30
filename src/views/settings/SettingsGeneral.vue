<template>
  <div class="settings-page">
    <h1 class="settings-title">{{ t('settings.title') }}</h1>

    <div class="settings-content">
      <!-- 通用设置 -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.general') }}</div>
        <div class="group-content">
          <div class="setting-item">
            <span class="item-label">{{ t('settings.displayMode') }}</span>
            <div class="theme-select-wrapper" ref="themeSelectRef">
              <div class="theme-select-trigger" @click="toggleThemeDropdown">
                <span>{{ currentThemeLabel }}</span>
                <svg class="theme-select-arrow" :class="{ expanded: showThemeDropdown }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div v-if="showThemeDropdown" class="theme-dropdown-menu">
                <div
                  v-for="option in themeOptions"
                  :key="option.value"
                  :class="['theme-dropdown-item', { active: settings.displayMode === option.value }]"
                  @click="selectTheme(option.value)"
                >
                  <span>{{ option.label }}</span>
                  <svg v-if="settings.displayMode === option.value" class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.fontSize') }}</span>
            <div class="font-size-options">
              <div
                v-for="option in fontSizeOptions"
                :key="option.value"
                :class="['font-size-option', { active: settings.fontSize === option.value }]"
                @click="settings.fontSize = option.value"
              >
                {{ option.label }}
              </div>
            </div>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.language') }}</span>
            <div class="theme-select-wrapper" ref="langSelectRef">
              <div class="theme-select-trigger" @click="toggleLangDropdown">
                <span>{{ currentLangLabel }}</span>
                <svg class="theme-select-arrow" :class="{ expanded: showLangDropdown }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div v-if="showLangDropdown" class="theme-dropdown-menu">
                <div
                  v-for="option in langOptions"
                  :key="option.value"
                  :class="['theme-dropdown-item', { active: currentLanguage === option.value }]"
                  @click="selectLanguage(option.value)"
                >
                  <span>{{ option.label }}</span>
                  <svg v-if="currentLanguage === option.value" class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.messageNotify') }}</span>
            <label class="toggle-switch">
              <input type="checkbox" v-model="settings.messageNotify" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.scheduleDefaultView') }}</span>
            <div class="font-size-options">
              <div
                :class="['font-size-option', { active: settings.scheduleDefaultView === 'week' }]"
                @click="selectScheduleView('week')"
              >{{ t('settings.viewWeek') }}</div>
              <div
                :class="['font-size-option', { active: settings.scheduleDefaultView === 'month' }]"
                @click="selectScheduleView('month')"
              >{{ t('settings.viewMonth') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 桌面宠物 -->
      <div class="settings-group">
        <div class="group-title">桌面宠物</div>
        <div class="group-content">
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">显示桌面宠物</span>
              <span class="item-hint">在桌面上显示悬浮的助手形象，实时展示对话状态，可拖动位置。</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="petEnabled" @change="savePetConfig" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">宠物形象</span>
              <span class="item-hint">默认使用「助手资料」中设置的头像，也可导入自定义图片。</span>
            </div>
            <div class="pet-avatar-actions">
              <img :src="petAvatarPreview" class="pet-avatar-preview" alt="pet avatar" />
              <button class="pet-mini-btn" @click="triggerPetAvatarPick">导入</button>
              <button v-if="petAvatar" class="pet-mini-btn" @click="resetPetAvatar">默认</button>
              <input
                ref="petAvatarInputRef"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                class="hidden-input"
                @change="onPetAvatarPicked"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 功能模块 -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.modules') }}</div>
        <div class="group-content">
          <div class="setting-item clickable" @click="goToModuleSettings">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.sidebarModules') }}</span>
              <span class="item-hint">{{ t('settings.sidebarModulesHint', { count: enabledModuleCount, total: sidebarModuleCount }) }}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
      </div>

      <!-- AI工具 -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.aiTools') }}</div>
        <div class="group-content">
          <div class="setting-item clickable" @click="goToModelSettings">
            <span class="item-label">{{ t('settings.modelSettings') }}</span>
            <span class="item-link">
              {{ t('settings.customModelHint') }}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </span>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.noteFimCompletion') }}</span>
            <label class="toggle-switch">
              <input type="checkbox" v-model="settings.noteFimCompletion" @change="saveNoteFimCompletion" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Python 环境 -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.pythonEnv') }}</div>
        <div class="group-content">
          <!-- 当前状态 -->
          <div class="setting-item">
            <span class="item-label">{{ t('settings.pythonStatus') }}</span>
            <span class="item-link" :class="{ 'python-ok': pythonState.available, 'python-warn': !pythonState.available }">
              <template v-if="pythonState.loading">…</template>
              <template v-else-if="!pythonState.available && pythonState.reason === 'not_configured'">
                {{ t('settings.pythonNotConfigured') }}
              </template>
              <template v-else-if="!pythonState.available">
                {{ t('settings.pythonUnavailable') }}
              </template>
              <template v-else>
                {{ t('settings.pythonReady') }} · {{ pythonState.version }}
              </template>
            </span>
          </div>
          <!-- 已配置路径 -->
          <div class="setting-item clickable" @click="selectPythonFile">
            <span class="item-label">{{ t('settings.pythonPath') }}</span>
            <span class="item-link">
              {{ pythonState.configured ? shortenPath(pythonState.configured) : t('settings.pythonPathHint') }}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </span>
          </div>
          <!-- 自动检测（含依赖校验） -->
          <div class="setting-item">
            <span class="item-label">{{ t('settings.pythonAutoDetect') }}</span>
            <button
              class="action-btn"
              :disabled="detectBusy"
              @click="autoDetectPython"
            >
              {{ detectBtnLabel }}
            </button>
          </div>
        </div>
      </div>

      <!-- 系统级工具 -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.systemTools') }}</div>
        <div class="group-hint">{{ t('settings.systemToolsHint') }}</div>
        <div class="group-content">
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">WSL</span>
              <span class="item-hint">Windows Subsystem for Linux</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="systemTools.wsl" @change="saveSystemTools" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">wmic</span>
              <span class="item-hint">Windows Management Instrumentation Command</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="systemTools.wmic" @change="saveSystemTools" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">sc</span>
              <span class="item-hint">Service Controller（服务管理）</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="systemTools.sc" @change="saveSystemTools" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">reg</span>
              <span class="item-hint">Registry Editor（注册表操作）</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="systemTools.reg" @change="saveSystemTools" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">schtasks</span>
              <span class="item-hint">Task Scheduler（计划任务）</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="systemTools.schtasks" @change="saveSystemTools" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- 内置运行时 -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.builtinRuntime') }}</div>
        <div class="group-hint">{{ t('settings.builtinRuntimeHint') }}</div>
        <div class="group-content">
          <div class="setting-item runtime-header">
            <span class="item-label runtime-col-tool">{{ t('settings.toolPython') }}</span>
            <span class="item-label runtime-col-desc">{{ t('settings.toolPythonDesc') }}</span>
            <div class="runtime-col-status">
              <label class="toggle-switch">
                <input type="checkbox" v-model="builtinRuntime.python" @change="saveBuiltinRuntime" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item runtime-header">
            <span class="item-label runtime-col-tool">{{ t('settings.toolNodejs') }}</span>
            <span class="item-label runtime-col-desc">{{ t('settings.toolNodejsDesc') }}</span>
            <div class="runtime-col-status">
              <label class="toggle-switch">
                <input type="checkbox" v-model="builtinRuntime.nodejs" @change="saveBuiltinRuntime" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item runtime-header">
            <span class="item-label runtime-col-tool">{{ t('settings.toolGitBash') }}</span>
            <span class="item-label runtime-col-desc">{{ t('settings.toolGitBashDesc') }}</span>
            <div class="runtime-col-status">
              <label class="toggle-switch">
                <input type="checkbox" v-model="builtinRuntime.gitBash" @change="saveBuiltinRuntime" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据备份 -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.backup') }}</div>
        <div class="group-content">
          <div class="setting-item">
            <span class="item-label">{{ t('settings.backupNow') }}</span>
            <button
              class="action-btn"
              :disabled="backupState.backing"
              @click="handleBackup"
            >
              {{ backupState.backing ? t('settings.backing') : t('settings.createBackup') }}
            </button>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.exportAllNotes') }}</span>
            <button class="action-btn" :disabled="noteExporting" @click="handleExportAllNotes">
              {{ noteExporting ? t('settings.exportingNotes') : t('settings.exportNotes') }}
            </button>
          </div>
          <div v-if="backupProgress.active" class="setting-item backup-progress-item">
            <div class="backup-progress-content">
              <div class="backup-progress-main">
                <span class="item-label">{{ backupProgressLabel }}</span>
                <span class="item-link">{{ backupProgress.compressing ? '' : (backupProgressPercent + '%') }}</span>
              </div>
              <div class="backup-progress-bar">
                <div class="backup-progress-fill" :style="{ width: backupProgressPercent + '%' }"></div>
              </div>
              <div v-if="backupProgress.name && !backupProgress.compressing" class="backup-progress-file" :title="backupProgress.name">
                {{ backupProgress.name }}
              </div>
            </div>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.restoreData') }}</span>
            <button
              class="text-btn"
              :disabled="backupState.restoring"
              @click="handleRestore"
            >
              {{ backupState.restoring ? t('settings.restoring') : t('settings.restoreFromBackup') }}
            </button>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.autoBackup') }}</span>
            <label class="toggle-switch">
              <input type="checkbox" v-model="backupConfig.enabled" @change="saveBackupConfig" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div v-if="backupConfig.enabled" class="setting-item">
            <span class="item-label">{{ t('settings.backupFrequency') }}</span>
            <div class="font-size-options">
              <div
                :class="['font-size-option', { active: backupConfig.interval === 'daily' }]"
                @click="setBackupInterval('daily')"
              >{{ t('settings.daily') }}</div>
              <div
                :class="['font-size-option', { active: backupConfig.interval === 'weekly' }]"
                @click="setBackupInterval('weekly')"
              >{{ t('settings.weekly') }}</div>
            </div>
          </div>
          <div v-if="backupConfig.enabled" class="setting-item clickable" @click="selectBackupDir">
            <span class="item-label">{{ t('settings.backupDir') }}</span>
            <span class="item-link">
              {{ backupConfig.autoDir ? shortenPath(backupConfig.autoDir) : t('settings.notSet') }}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </span>
          </div>
          <div v-if="backupConfig.enabled && isElectronWin32" class="setting-item">
            <span class="item-label">{{ t('settings.selectDrive') }}</span>
            <button class="action-btn" @click="selectDriveForBackup">{{ t('settings.selectDrive') }}</button>
          </div>
          <div v-if="backupConfig.lastBackupAt" class="setting-item">
            <span class="item-label">{{ t('settings.lastBackupTime') }}</span>
            <span class="item-link">{{ formatBackupTime(backupConfig.lastBackupAt) }}</span>
          </div>
        </div>
      </div>

      <!-- DeepSeek Harness 工作区 -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.harnessWorkspace') }}</div>
        <div class="group-content">
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.harnessWorkspacePath') }}</span>
              <span class="item-hint">{{ t('settings.harnessWorkspaceHint') }}</span>
            </div>
            <span
              class="item-link harness-workspace-path copyable"
              :title="t('settings.clickToCopy')"
              @click="copyHarnessWorkspace"
            >
              {{ harnessWorkspace.path || (harnessWorkspace.defaultPath + ' （默认）') }}
            </span>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.harnessWorkspaceAction') }}</span>
            <div class="setting-item-actions">
              <button class="action-btn" :disabled="harnessSelecting" @click="selectHarnessWorkspace">
                {{ harnessSelecting ? t('settings.selecting') : t('settings.selectDir') }}
              </button>
              <button v-if="isElectronWin32" class="action-btn" :disabled="harnessSelecting" @click="selectDriveForHarness">
                {{ t('settings.selectDrive') }}
              </button>
              <button class="text-btn" :disabled="harnessSelecting" @click="openHarnessWorkspace">
                {{ t('settings.openFileManager') }}
              </button>
              <button
                v-if="harnessWorkspace.path"
                class="text-btn"
                :disabled="harnessSelecting"
                @click="resetHarnessWorkspace"
              >
                {{ t('settings.resetDefault') }}
              </button>
            </div>
          </div>
          <div v-if="harnessWorkspaceError" class="setting-item harness-workspace-error">
            <span class="item-link error-message">{{ harnessWorkspaceError }}</span>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-title">{{ t('settings.history') }}</div>
        <div class="group-content">
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.autoCleanHistory') }}</span>
              <span class="item-hint">{{ t('settings.autoCleanHistoryHint') }}</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="historyConfig.autoClean" @change="onAutoCleanToggle" />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div v-if="historyConfig.autoClean" class="setting-item">
            <span class="item-label">{{ t('settings.cleanBefore') }}</span>
            <div class="font-size-options">
              <div
                :class="['font-size-option', { active: historyConfig.cleanBefore === '1month' }]"
                @click="setCleanBefore('1month')"
              >{{ t('settings.clean1month') }}</div>
              <div
                :class="['font-size-option', { active: historyConfig.cleanBefore === '3months' }]"
                @click="setCleanBefore('3months')"
              >{{ t('settings.clean3months') }}</div>
              <div
                :class="['font-size-option', { active: historyConfig.cleanBefore === '6months' }]"
                @click="setCleanBefore('6months')"
              >{{ t('settings.clean6months') }}</div>
              <div
                :class="['font-size-option', { active: historyConfig.cleanBefore === '1year' }]"
                @click="setCleanBefore('1year')"
              >{{ t('settings.clean1year') }}</div>
            </div>
          </div>
          <div v-if="historyConfig.autoClean && historyConfig.lastCleanAt" class="setting-item">
            <span class="item-label">{{ t('settings.lastCleanTime') }}</span>
            <span class="item-link">{{ formatBackupTime(historyConfig.lastCleanAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 知识库检索 (RAG) -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.rag') }}</div>
        <div class="group-content">
          <div class="setting-item">
            <span class="item-label">{{ t('settings.updateIndex') }}</span>
            <button
              class="primary-btn"
              :disabled="ragState.updating"
              @click="handleRagUpdate"
            >
              {{ ragState.updating ? t('settings.updating') : t('settings.updateIndex') }}
            </button>
          </div>
          <div v-if="ragState.progress || ragState.updating" class="setting-item rag-progress-item">
            <div class="rag-progress-content">
              <div class="rag-progress-main">
                <span class="item-label">{{ ragProgressMainLabel }}</span>
                <span class="item-link">{{ ragState.progress }}</span>
              </div>
              <div class="rag-progress-detail" v-if="ragState.fileName">
                <span class="rag-progress-file" :title="ragState.fileName">{{ ragState.fileName }}</span>
                <span class="rag-progress-meta" v-if="ragState.totalChunks > 0">· {{ ragState.currentChunk }}/{{ ragState.totalChunks }} {{ t('settings.chunks') }}</span>
                <span class="rag-progress-meta rag-progress-failed" v-if="ragState.failedCount > 0">· {{ t('settings.failed') }} {{ ragState.failedCount }}</span>
              </div>
            </div>
          </div>
          <div class="setting-item rag-stats-row">
            <span class="item-label">{{ t('settings.indexStats') }}</span>
            <div class="rag-stats-inline" v-if="ragStats && Object.keys(ragStats).length > 0">
              <span
                v-for="(stat, kbType) in ragStats"
                :key="kbType"
                class="rag-stat-chip"
                :class="{ 'has-issues': (stat.pending || 0) + (stat.failed || 0) > 0 }"
              >
                <span class="rag-stat-kb">{{ kbTypeLabel(kbType) }}</span>
                <span class="rag-stat-detail">{{ stat.success || 0 }}/{{ stat.total || 0 }}</span>
                <span class="rag-stat-vectors" v-if="stat.vectorCount">{{ stat.vectorCount }}v</span>
              </span>
            </div>
            <span v-else class="item-link">{{ t('settings.noData') }}</span>
          </div>
        </div>
      </div>

      <!-- 直接连接（内嵌微信 / QQ 机器人） -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.direct') }}</div>
        <div class="group-hint">{{ t('settings.directHint') }}</div>
        <div class="group-content">
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.directWechat') }}</span>
              <span class="item-hint">{{ t('settings.directWechatHint') }}</span>
            </div>
            <div class="item-action-row">
              <span class="item-link" :class="wechatOn ? 'python-ok' : 'python-warn'">
                {{ wechatOn ? t('settings.directConnected') : t('settings.directDisconnected') }}
              </span>
              <button v-if="!wechatOn" class="primary-btn" :disabled="directBusy" @click="startWechat">
                {{ t('settings.directConnect') }}
              </button>
              <button v-else class="ghost-btn" :disabled="directBusy" @click="stopWechat">
                {{ t('settings.directDisconnect') }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- QQ 官方机器人（开放平台，合规） -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.qqbot') }}</div>
        <div class="group-hint">{{ t('settings.qqbotHint') }}</div>
        <div class="group-content">
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.qqbotAppid') }}</span>
            </div>
            <div class="item-action-row">
              <input class="text-input" v-model="qqbotAppid" placeholder="appid" />
            </div>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.qqbotSecret') }}</span>
            </div>
            <div class="item-action-row">
              <input class="text-input" type="password" v-model="qqbotSecret" placeholder="client secret" />
            </div>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.qqbotToken') }}</span>
            </div>
            <div class="item-action-row">
              <input class="text-input" type="password" v-model="qqbotToken" placeholder="bot token（可选）" />
            </div>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.qqbotApiBase') }}</span>
              <span class="item-hint">{{ t('settings.qqbotApiBaseHint') }}</span>
            </div>
            <div class="item-action-row">
              <input class="text-input" v-model="qqbotApiBase" />
            </div>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.qqbotGateway') }}</span>
              <span class="item-hint">{{ t('settings.qqbotGatewayHint') }}</span>
            </div>
            <div class="item-action-row">
              <input class="text-input" v-model="qqbotGateway" />
            </div>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">配置操作</span>
              <span class="item-hint">保存凭据可快速连接；删除将清除本地令牌</span>
            </div>
            <div class="item-action-row">
              <button class="primary-btn" :disabled="directBusy" @click="saveQQBotConfig">
                保存
              </button>
              <button class="ghost-btn danger-btn" :disabled="directBusy" @click="deleteQQBotConfig">
                删除
              </button>
            </div>
          </div>
          <div class="setting-item">
            <div class="item-label-group">
              <span class="item-label">{{ t('settings.qqbotStatus') }}</span>
            </div>
            <div class="item-action-row">
              <span class="item-link" :class="qqbotOn ? 'python-ok' : 'python-warn'">
                {{ qqbotOn ? t('settings.directConnected') : t('settings.directDisconnected') }}
              </span>
              <button v-if="!qqbotOn" class="primary-btn" :disabled="directBusy" @click="startQQBot">
                {{ t('settings.directConnect') }}
              </button>
              <button v-else class="ghost-btn" :disabled="directBusy" @click="stopQQBot">
                {{ t('settings.directDisconnect') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 远程开机 -->
      <div class="settings-group">
        <div class="group-title">远程开机（Wake-on-LAN）</div>
        <div class="group-content">
          <p style="color: var(--text-secondary); font-size: 13px; margin: 0 0 12px;">
            添加局域网内需要远程开机的电脑，手机端也可管理同一列表。
          </p>
          <div v-for="(pc, idx) in wolComputers" :key="pc.id || idx" class="setting-item" style="align-items: flex-start;">
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ pc.name }}</div>
              <div style="font-size: 12px; color: var(--text-secondary);">MAC: {{ pc.mac }} 广播: {{ pc.broadcast }}</div>
            </div>
            <button class="text-btn" style="color: var(--success-color);" @click="wolSend(pc)">开机</button>
            <button class="text-btn" style="color: var(--danger-color);" @click="wolRemove(idx)">删除</button>
          </div>
          <div class="setting-item" style="flex-wrap: wrap; gap: 8px;">
            <input v-model="wolNew.name" placeholder="电脑名称" style="flex: 1; min-width: 100px;" class="text-input" />
            <input v-model="wolNew.mac" placeholder="AA:BB:CC:DD:EE:FF" style="flex: 1; min-width: 160px;" class="text-input" />
            <input v-model="wolNew.broadcast" placeholder="广播地址（可选，默认 255.255.255.255）" style="flex: 1; min-width: 180px;" class="text-input" />
            <button class="primary-btn" @click="wolAdd">添加</button>
          </div>
        </div>
      </div>

      <!-- 关于 -->
      <div class="settings-group">
        <div class="group-title">{{ t('settings.about') }}</div>
        <div class="group-content">
          <div class="setting-item clickable" @click="showAboutModal = true">
            <span class="item-label">{{ t('settings.aboutApp') }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.versionLabel') }}&nbsp;{{ appVersion }}</span>
            <button class="text-btn" @click="checkForUpdate">{{ t('settings.checkUpdate') }}</button>
          </div>
          <div class="setting-item">
            <span class="item-label">{{ t('settings.runtimeLogs') }}</span>
            <div class="logs-actions">
              <button v-if="runtimeLogsEnabled" class="text-btn" @click="openLogDir">{{ t('settings.openLogDir') }}</button>
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  v-model="runtimeLogsEnabled"
                  :aria-label="t('settings.runtimeLogsEnabled')"
                  @change="saveRuntimeLogsConfig"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="setting-item clickable" @click="showFeaturesModal = true">
            <span class="item-label">{{ t('settings.features') }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
          <div class="setting-item clickable" @click="openHelpUrl">
            <span class="item-label">{{ t('settings.helpFeedback') }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
          <div class="setting-item clickable" @click="showAuthorModal = true">
            <span class="item-label">作者介绍</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 关于 Phronesis 弹窗 -->
    <Teleport to="body">
      <div v-if="showAboutModal" class="info-modal-overlay" @click.self="showAboutModal = false">
        <div class="info-modal-container">
          <button class="info-modal-close" @click="showAboutModal = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div class="about-modal-body">
            <h2 class="about-title">Phronesis</h2>
            <p class="about-version">{{ t('settings.version') }} {{ appVersion }}</p>
            <p class="about-desc">{{ t('settings.aboutDesc') }}</p>
            <div class="about-links">
              <a class="about-link" @click="openHelpUrl">{{ t('settings.githubLink') }}</a>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 功能介绍 弹窗 -->
    <Teleport to="body">
      <div v-if="showFeaturesModal" class="info-modal-overlay" @click.self="showFeaturesModal = false">
        <div class="info-modal-container info-modal-wide">
          <div class="info-modal-header">
            <h3 class="info-modal-title">{{ t('settings.features') }}</h3>
            <button class="info-modal-close" @click="showFeaturesModal = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="features-modal-body">
            <div v-for="feature in features" :key="feature.title" class="feature-item">
              <div class="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="feature.icon"></svg>
              </div>
              <div class="feature-text">
                <div class="feature-name">{{ feature.title }}</div>
                <div class="feature-desc">{{ feature.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 作者介绍 弹窗 -->
    <Teleport to="body">
      <div v-if="showAuthorModal" class="info-modal-overlay" @click.self="showAuthorModal = false">
        <div class="author-modal">
          <button class="author-modal-close" @click="showAuthorModal = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="author-content">
            <h2 class="author-name-lg">暂不透露</h2>
            <p class="author-subtitle">独立开发者 · Phronesis 作者</p>

            <div class="author-divider"></div>

            <div class="author-block">
              <div class="author-block-title">研究方向</div>
              <p class="author-desc">大模型应用与智能体（Agent）系统：RAG 检索增强、工具调用与多智能体协作的工程化落地。</p>
            </div>

            <div class="author-divider"></div>

            <div class="author-block">
              <div class="author-block-title">业余爱好</div>
              <p class="author-desc">写开源工具和效率软件。</p>
            </div>

            <div class="author-divider"></div>

            <a class="author-link" @click="openAuthorHomepage">
              GitHub 项目主页
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 通用提示弹窗（替代原生 alert/confirm） -->
    <Teleport to="body">
      <Transition name="appdlg-fade">
        <div v-if="dialog.visible" class="appdlg-overlay" @click.self="handleDialogCancel">
          <Transition name="appdlg-scale">
            <div v-if="dialog.visible" class="appdlg-card" :class="`is-${dialog.type}`" role="dialog" aria-modal="true">
              <div class="appdlg-icon">
                <svg v-if="dialog.type === 'success'" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <svg v-else-if="dialog.type === 'error'" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <svg v-else-if="dialog.type === 'warning'" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <svg v-else-if="dialog.type === 'confirm'" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <svg v-else width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <h3 class="appdlg-title">{{ dialogTitle }}</h3>
              <p v-if="dialog.message" class="appdlg-message">{{ dialog.message }}</p>
              <div v-if="dialog.details" class="appdlg-details">{{ dialog.details }}</div>
              <div class="appdlg-actions">
                <button v-if="dialog.type === 'confirm'" class="appdlg-btn appdlg-cancel" @click="handleDialogCancel">{{ dialog.cancelText }}</button>
                <button class="appdlg-btn appdlg-confirm" @click="handleDialogConfirm">{{ dialog.confirmText }}</button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted, onDeactivated } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/store';
import { useTheme } from '@/utils/theme';
import { electronService } from '@/services/electron';
import { setI18nLanguage } from '@/i18n';
import { sidebarModuleConfig } from '@/config/menu';
import packageJson from '../../../package.json';

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();
const { currentMode, appliedTheme, setTheme: applyTheme, initTheme } = useTheme();

const showThemeDropdown = ref(false);
const themeSelectRef = ref(null);
const showLangDropdown = ref(false);
const langSelectRef = ref(null);
let unsubBackupProgress = null;
let unsubQrPush = null;

const themeOptions = computed(() => [
  { value: 'light', label: t('settings.themeLight') },
  { value: 'dark', label: t('settings.themeDark') },
  { value: 'system', label: t('settings.themeSystem') }
]);

const langOptions = computed(() => [
  { value: 'zh-CN', label: t('settings.langZhCN') },
  { value: 'en-US', label: t('settings.langEnUS') }
]);

const currentLanguage = ref(appStore.language || 'zh-CN');

const fontSizeOptions = computed(() => [
  { value: 14, label: t('settings.fontSizeSmall') },
  { value: 16, label: t('settings.fontSizeStandard') },
  { value: 18, label: t('settings.fontSizeLarge') }
]);

const currentThemeLabel = computed(() => {
  const option = themeOptions.value.find(opt => opt.value === currentMode.value);
  return option?.label || t('settings.themeLight');
});

const currentLangLabel = computed(() => {
  const option = langOptions.value.find(opt => opt.value === currentLanguage.value);
  return option?.label || t('settings.langZhCN');
});

const settings = reactive({
  displayMode: currentMode,
  fontSize: 16,
  messageNotify: false,
  noteFimCompletion: appStore.noteFimCompletion,
  scheduleDefaultView: appStore.scheduleDefaultView || 'month'
});

const enabledModuleCount = computed(() => Object.values(appStore.sidebarModules).filter(Boolean).length);
const sidebarModuleCount = sidebarModuleConfig.length;

const runtimeLogsEnabled = ref(true);
const noteExporting = ref(false);

// ========== 桌面宠物 ==========
const petEnabled = ref(false);
const petAvatar = ref(null);
const assistantAvatar = ref(null);
const petAvatarInputRef = ref(null);
const petAvatarPreview = computed(() => petAvatar.value || assistantAvatar.value || `${import.meta.env.BASE_URL}images/icon.png`);

const loadPetSettings = async () => {
  try {
    const config = await electronService.invoke('get-config');
    petEnabled.value = config?.pet?.enabled === true;
    petAvatar.value = config?.pet?.avatar || null;
    assistantAvatar.value = config?.assistantProfile?.avatar || null;
  } catch (_e) {}
};

const savePetConfig = async () => {
  try {
    const config = await electronService.invoke('get-config');
    config.pet = { ...(config.pet || {}), enabled: petEnabled.value, avatar: petAvatar.value };
    await electronService.invoke('save-config', config);
  } catch (e) {
    console.error('Failed to save pet config:', e);
  }
};

const triggerPetAvatarPick = () => petAvatarInputRef.value?.click();

const onPetAvatarPicked = (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      petAvatar.value = canvas.toDataURL('image/png');
      savePetConfig();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
};

const resetPetAvatar = () => {
  petAvatar.value = null;
  savePetConfig();
};

// ========== 系统级工具 ==========
const systemTools = reactive({
  wsl: false,
  wmic: false,
  sc: false,
  reg: false,
  schtasks: false
});

const loadSystemTools = async () => {
  try {
    const config = await electronService.invoke('get-config');
    const tools = config?.systemTools || {};
    systemTools.wsl = tools.wsl === true;
    systemTools.wmic = tools.wmic === true;
    systemTools.sc = tools.sc === true;
    systemTools.reg = tools.reg === true;
    systemTools.schtasks = tools.schtasks === true;
  } catch (_e) {}
};

const saveSystemTools = async () => {
  try {
    const config = await electronService.invoke('get-config');
    config.systemTools = { ...systemTools };
    await electronService.invoke('save-config', config);
  } catch (e) {
    console.error('Failed to save system tools config:', e);
  }
};

// ========== 内置运行时 ==========
const builtinRuntime = reactive({
  python: true,
  nodejs: true,
  gitBash: true
});

const loadBuiltinRuntime = async () => {
  try {
    const config = await electronService.invoke('get-config');
    const runtime = config?.builtinRuntime || {};
    builtinRuntime.python = runtime.python !== false;
    builtinRuntime.nodejs = runtime.nodejs !== false;
    builtinRuntime.gitBash = runtime.gitBash !== false;
  } catch (_e) {}
};

const saveBuiltinRuntime = async () => {
  try {
    const config = await electronService.invoke('get-config');
    config.builtinRuntime = { ...builtinRuntime };
    await electronService.invoke('save-config', config);
  } catch (e) {
    console.error('Failed to save builtin runtime config:', e);
  }
};

// ========== 通用提示弹窗（替代原生 alert/confirm） ==========
const dialog = reactive({
  visible: false,
  type: 'info', // success | error | warning | info | confirm
  title: '',
  message: '',
  details: '',
  confirmText: '',
  cancelText: '',
  _resolve: null
});

const dialogTitle = computed(() => {
  if (dialog.title) return dialog.title;
  switch (dialog.type) {
    case 'success': return t('settings.dialogSuccessTitle');
    case 'error': return t('settings.dialogErrorTitle');
    case 'confirm': return t('settings.dialogConfirmTitle');
    case 'warning':
    case 'info':
    default: return t('settings.dialogWarningTitle');
  }
});

const showDialog = (options) => new Promise((resolve) => {
  Object.assign(dialog, {
    visible: true,
    type: options.type || 'info',
    title: options.title || '',
    message: options.message || '',
    details: options.details || '',
    confirmText: options.confirmText || t('settings.dialogConfirm'),
    cancelText: options.cancelText || t('settings.dialogCancel'),
    _resolve: resolve
  });
});

const closeDialog = (result) => {
  dialog.visible = false;
  const resolve = dialog._resolve;
  dialog._resolve = null;
  if (resolve) resolve(result);
};

const handleDialogConfirm = () => closeDialog(true);
const handleDialogCancel = () => closeDialog(false);

const notifySuccess = (message, options = {}) => showDialog({ ...options, type: 'success', message });
const notifyError = (message, options = {}) => showDialog({ ...options, type: 'error', message });
const notifyWarning = (message, options = {}) => showDialog({ ...options, type: 'warning', message });
const confirmDialog = (message, options = {}) => showDialog({
  ...options,
  type: 'confirm',
  message,
  confirmText: options.confirmText || t('settings.dialogConfirm'),
  cancelText: options.cancelText || t('settings.dialogCancel')
});

const handleExportAllNotes = async () => {
  if (noteExporting.value) return;
  noteExporting.value = true;
  try {
    const result = await electronService.invoke('export_all_notes');
    if (!result || result.canceled) return;
    if (result.success) {
      await notifySuccess(t('settings.exportNotesSuccess', { count: result.exported }), { details: result.exportDir });
    } else {
      const details = result.errors?.map(item => `${item.title}: ${item.error}`).join('\n');
      await notifyError(t('settings.exportNotesFailed', { exported: result.exported, total: result.total }), { details });
    }
  } catch (e) {
    await notifyError(t('settings.directStopFailed') + ': ' + e);
  } finally {
    directBusy.value = false;
  }
};
const startQQBot = async () => {
  if (directBusy.value) return;
  directBusy.value = true;
  try {
    await electronService.invoke('bridge-save-config', {
      qqbot: {
        appid: qqbotAppid.value,
        secret: qqbotSecret.value,
        token: qqbotToken.value,
        apiBase: qqbotApiBase.value,
        gatewayUrl: qqbotGateway.value,
        sandbox: true
      }
    });
    const res = await electronService.invoke('bridge-qqbot-start');
    if (res?.success) {
      qqbotOn.value = !!res.status?.qqbot;
      await notifySuccess(t('settings.qqbotConnected'));
    } else {
      await notifyError(t('settings.directStartFailed') + ': ' + (res?.error || ''));
    }
  } catch (e) {
    await notifyError(t('settings.directStartFailed') + ': ' + e);
  } finally {
    directBusy.value = false;
    await refreshDirectStatus();
  }
};
const stopQQBot = async () => {
  if (directBusy.value) return;
  directBusy.value = true;
  try {
    const res = await electronService.invoke('bridge-qqbot-stop');
    if (res?.success) qqbotOn.value = false;
    else await notifyError(t('settings.directStopFailed') + ': ' + (res?.error || ''));
  } catch (e) {
    await notifyError(t('settings.directStopFailed') + ': ' + e);
  } finally {
    directBusy.value = false;
  }
};
const saveQQBotConfig = async () => {
  if (directBusy.value) return;
  directBusy.value = true;
  try {
    const res = await electronService.invoke('bridge-qqbot-save', {
      appid: qqbotAppid.value,
      secret: qqbotSecret.value,
      token: qqbotToken.value,
      apiBase: qqbotApiBase.value,
      gatewayUrl: qqbotGateway.value,
      sandbox: true
    });
    if (res?.success) await notifySuccess('QQ 机器人配置已保存');
    else await notifyError('保存失败: ' + (res?.error || ''));
  } catch (e) {
    await notifyError('保存失败: ' + e);
  } finally {
    directBusy.value = false;
  }
};
const deleteQQBotConfig = async () => {
  if (directBusy.value) return;
  if (!confirm('确定删除 QQ 机器人配置并清除本地令牌？')) return;
  directBusy.value = true;
  try {
    const res = await electronService.invoke('bridge-qqbot-delete');
    if (res?.success) {
      qqbotAppid.value = '';
      qqbotSecret.value = '';
      qqbotToken.value = '';
      qqbotGateway.value = '';
      qqbotApiBase.value = 'https://api.bot.qq.com';
      qqbotOn.value = false;
      await notifySuccess('QQ 机器人配置已删除');
    } else {
      await notifyError('删除失败: ' + (res?.error || ''));
    }
  } catch (e) {
    await notifyError('删除失败: ' + e);
  } finally {
    directBusy.value = false;
  }
};

// 备份状态
const backupState = reactive({
  backing: false,
  restoring: false
});

const backupConfig = reactive({
  enabled: false,
  interval: 'daily',
  lastBackupAt: null,
  autoDir: null,
  maxKeep: 7
});

// 对话历史自动清理配置（默认关闭，开启后按阈值清理长期未活动的会话）
const historyConfig = reactive({
  autoClean: false,
  cleanBefore: '3months',
  lastCleanAt: null
});

// 备份进度（由主进程 worker 推送的事件驱动）
const backupProgress = reactive({
  active: false,
  current: 0,
  total: 0,
  name: '',
  compressing: false
});

const backupProgressPercent = computed(() => {
  if (backupProgress.compressing) return 100;
  if (!backupProgress.total) return 0;
  return Math.min(100, Math.round((backupProgress.current / backupProgress.total) * 100));
});

const backupProgressLabel = computed(() => {
  if (backupProgress.compressing) return t('settings.backupCompressing');
  if (backupProgress.total > 0) {
    return `${t('settings.backupPacking')} ${backupProgress.current}/${backupProgress.total}`;
  }
  return t('settings.backing');
});

const handleBackupProgress = (p) => {
  if (!p) return;
  if (p.compressing) {
    backupProgress.compressing = true;
  } else {
    backupProgress.compressing = false;
    backupProgress.current = p.current || 0;
    backupProgress.total = p.total || 0;
    backupProgress.name = p.name || '';
  }
};

const loadBackupConfig = async () => {
  try {
    const cfg = await electronService.invoke('backup-get-config');
    if (cfg) {
      backupConfig.enabled = cfg.enabled || false;
      backupConfig.interval = cfg.interval || 'daily';
      backupConfig.lastBackupAt = cfg.lastBackupAt || null;
      backupConfig.autoDir = cfg.autoDir || null;
      backupConfig.maxKeep = cfg.maxKeep || 7;
    }
  } catch (e) {
    console.error('加载备份配置失败:', e);
  }
};

const saveBackupConfig = async () => {
  try {
    await electronService.invoke('backup-set-config', {
      enabled: backupConfig.enabled,
      interval: backupConfig.interval,
      autoDir: backupConfig.autoDir,
      maxKeep: backupConfig.maxKeep
    });
  } catch (e) {
    console.error('保存备份配置失败:', e);
  }
};

const setBackupInterval = (val) => {
  backupConfig.interval = val;
  saveBackupConfig();
};

// 选择驱动器用于备份目录（Windows 下先选盘符，再选目录）
const selectDriveForBackup = async () => {
  if (window.electronAPI?.isElectron && process.platform !== 'win32') {
    // 非 Windows 直接选目录
    return selectBackupDir()
  }
  try {
    const driveResult = await electronService.invoke('select-drive')
    if (!driveResult.success) {
      if (!driveResult.canceled) {
        await notifyError(driveResult.error || t('settings.selectDirFailed'))
      }
      return
    }
    // 选中驱动器后，打开目录选择器
    const result = await electronService.invoke('backup-select-dir')
    if (result.success && result.dir) {
      backupConfig.autoDir = result.dir
      await saveBackupConfig()
    }
  } catch (e) {
    await notifyError(t('settings.selectDirFailed') + ': ' + e)
  }
}

// 直接选择备份目录（非 Windows 或跳过驱动器选择）
const selectBackupDir = async () => {
  try {
    const result = await electronService.invoke('backup-select-dir');
    if (result.success && result.dir) {
      backupConfig.autoDir = result.dir;
      await saveBackupConfig();
    }
  } catch (e) {
    await notifyError(t('settings.selectDirFailed') + ': ' + e);
  }
};

const handleBackup = async () => {
  if (backupState.backing) return;
  backupState.backing = true;
  backupProgress.active = true;
  backupProgress.current = 0;
  backupProgress.total = 0;
  backupProgress.name = '';
  backupProgress.compressing = false;
  try {
    const result = await electronService.invoke('backup-create');
    if (result.success) {
      backupConfig.lastBackupAt = new Date().toISOString();
    } else if (!result.canceled) {
      await notifyError(t('settings.backupFailed') + ': ' + (result.error || t('settings.unknownError')));
    }
  } catch (e) {
    await notifyError(t('settings.backupFailed') + ': ' + e);
  } finally {
    backupState.backing = false;
    // 稍后隐藏进度条
    setTimeout(() => { backupProgress.active = false; }, 1200);
  }
};

const handleRestore = async () => {
  if (backupState.restoring) return;
  const go = await confirmDialog(t('settings.restoreConfirm'));
  if (!go) return;
  backupState.restoring = true;
  try {
    const result = await electronService.invoke('backup-restore');
    if (result.success) {
      await notifySuccess(t('settings.restoreSuccess'));
      window.location.reload();
    } else if (!result.canceled) {
      await notifyError(t('settings.restoreFailed') + ': ' + (result.error || t('settings.unknownError')));
    }
  } catch (e) {
    await notifyError(t('settings.restoreFailed') + ': ' + e);
  } finally {
    backupState.restoring = false;
  }
};

// ========== DeepSeek Harness 工作区 ==========
const harnessWorkspace = reactive({ path: null, defaultPath: '', isCustom: false });
const harnessSelecting = ref(false);
const harnessWorkspaceError = ref('');

const loadHarnessWorkspace = async () => {
  try {
    const res = await electronService.invoke('harness-get-workspace');
    if (res) {
      harnessWorkspace.path = res.path || null;
      harnessWorkspace.defaultPath = res.defaultPath || '';
      harnessWorkspace.isCustom = !!res.path;
    }
    harnessWorkspaceError.value = '';
  } catch (e) {
    console.error('加载 Harness 工作区配置失败:', e);
  }
};

// 选择驱动器（Windows 下先选盘符，再选目录）
const selectDriveForHarness = async () => {
  if (harnessSelecting.value) return;
  if (window.electronAPI?.isElectron && process.platform !== 'win32') {
    // 非 Windows 直接选目录
    return selectHarnessWorkspace()
  }
  harnessSelecting.value = true
  harnessWorkspaceError.value = ''
  try {
    const driveResult = await electronService.invoke('select-drive')
    if (!driveResult.success) {
      if (!driveResult.canceled) {
        harnessWorkspaceError.value = driveResult.error || t('settings.selectDirFailed')
      }
      return
    }
    // 选中驱动器后，打开目录选择器
    const result = await electronService.invoke('harness-select-workspace')
    if (result.success && result.dir) {
      const saved = await electronService.invoke('harness-set-workspace', { dir: result.dir });
      if (saved.success) {
        harnessWorkspace.path = saved.dir || null;
        harnessWorkspace.isCustom = !!saved.dir;
        await notifySuccess(t('settings.harnessWorkspaceSaved'));
      } else {
        harnessWorkspaceError.value = saved.error || t('settings.unknownError');
      }
    } else if (!result.canceled) {
      harnessWorkspaceError.value = t('settings.selectDirFailed');
    }
  } catch (e) {
    harnessWorkspaceError.value = t('settings.selectDirFailed') + ': ' + e;
  } finally {
    harnessSelecting.value = false;
  }
};

// 直接选择目录（非 Windows 或跳过驱动器选择）
const selectHarnessWorkspace = async () => {
  if (harnessSelecting.value) return;
  harnessSelecting.value = true;
  harnessWorkspaceError.value = '';
  try {
    const result = await electronService.invoke('harness-select-workspace');
    if (result.success && result.dir) {
      const saved = await electronService.invoke('harness-set-workspace', { dir: result.dir });
      if (saved.success) {
        harnessWorkspace.path = saved.dir || null;
        harnessWorkspace.isCustom = !!saved.dir;
        await notifySuccess(t('settings.harnessWorkspaceSaved'));
      } else {
        harnessWorkspaceError.value = saved.error || t('settings.unknownError');
      }
    } else if (!result.canceled) {
      harnessWorkspaceError.value = t('settings.selectDirFailed');
    }
  } catch (e) {
    harnessWorkspaceError.value = t('settings.selectDirFailed') + ': ' + e;
  } finally {
    harnessSelecting.value = false;
  }
};

const resetHarnessWorkspace = async () => {
  harnessWorkspaceError.value = '';
  try {
    const saved = await electronService.invoke('harness-set-workspace', { dir: null });
    if (saved.success) {
      harnessWorkspace.path = null;
      harnessWorkspace.isCustom = false;
      await notifySuccess(t('settings.harnessWorkspaceReset'));
    } else {
      harnessWorkspaceError.value = saved.error || t('settings.unknownError');
    }
  } catch (e) {
    harnessWorkspaceError.value = t('settings.selectDirFailed') + ': ' + e;
  }
};

// 在系统文件管理器中打开当前工作区目录
const openHarnessWorkspace = async () => {
  harnessWorkspaceError.value = '';
  try {
    const res = await electronService.invoke('harness-open-workspace');
    if (!res.success) {
      harnessWorkspaceError.value = res.error || t('settings.openFailed');
    }
  } catch (e) {
    harnessWorkspaceError.value = t('settings.openFailed') + ': ' + e;
  }
};

// 点击路径复制完整路径到剪贴板
const copyHarnessWorkspace = async () => {
  const p = harnessWorkspace.path || harnessWorkspace.defaultPath;
  if (!p) return;
  try {
    await navigator.clipboard.writeText(p);
    await notifySuccess(t('settings.pathCopied'));
  } catch (e) {
    harnessWorkspaceError.value = t('settings.copyFailed') + ': ' + e;
  }
};

const shortenPath = (p) => {
  if (!p) return '';
  if (p.length <= 40) return p;
  return '...' + p.slice(-37);
};

const formatBackupTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ========== 对话历史自动清理 ==========
const loadHistoryConfig = async () => {
  try {
    const cfg = await electronService.invoke('history-get-config');
    if (cfg) {
      historyConfig.autoClean = cfg.autoClean || false;
      historyConfig.cleanBefore = cfg.cleanBefore || '3months';
      historyConfig.lastCleanAt = cfg.lastCleanAt || null;
    }
  } catch (e) {
    console.error('加载对话历史清理配置失败:', e);
  }
};

const saveHistoryConfig = async () => {
  try {
    const result = await electronService.invoke('history-set-config', {
      autoClean: historyConfig.autoClean,
      cleanBefore: historyConfig.cleanBefore
    });
    // 同步主进程回写的配置（含 lastCleanAt）
    if (result && result.history) {
      historyConfig.lastCleanAt = result.history.lastCleanAt || null;
    }
  } catch (e) {
    console.error('保存对话历史清理配置失败:', e);
  }
};

// 开关切换：保存配置；开启时立即执行一次清理（用户主动操作，不属于频繁扫描）
const onAutoCleanToggle = async () => {
  await saveHistoryConfig();
  if (!historyConfig.autoClean) return;
  try {
    const cleanResult = await electronService.invoke('history-clean-now');
    if (cleanResult && cleanResult.success && cleanResult.lastCleanAt) {
      historyConfig.lastCleanAt = cleanResult.lastCleanAt;
    }
  } catch (e) {
    console.error('立即清理对话历史失败:', e);
  }
};

const setCleanBefore = (val) => {
  historyConfig.cleanBefore = val;
  saveHistoryConfig();
};

// ========== Python 环境 ==========
const pythonState = reactive({
  loading: false,
  detecting: false,
  verifying: false,
  available: false,
  reason: '',
  configured: null,
  path: null,
  version: null,
  missingDeps: []
});

// 自动检测按钮：检测中或校验依赖中均禁用，标签随状态切换
const detectBusy = computed(() => pythonState.detecting || pythonState.verifying);
const detectBtnLabel = computed(() => {
  if (pythonState.verifying) return t('settings.pythonVerifying');
  if (pythonState.detecting) return t('settings.pythonDetecting');
  return t('settings.pythonAutoDetectBtn');
});

const loadPythonStatus = async () => {
  pythonState.loading = true;
  try {
    const st = await electronService.invoke('python-status');
    pythonState.available = !!st.available;
    pythonState.reason = st.reason || '';
    pythonState.configured = st.configured || null;
    pythonState.path = st.path || null;
    pythonState.version = st.version || null;
  } catch (e) {
    console.error('加载 Python 状态失败:', e);
  } finally {
    pythonState.loading = false;
  }
};

// 校验依赖：返回 { ok, missingDeps, error }。仅在 Python 可用时调用
const verifyPythonDepsInternal = async () => {
  if (!pythonState.available) {
    return { ok: false, skipped: true };
  }
  try {
    const result = await electronService.invoke('python-verify', { path: pythonState.path });
    if (result.ok) {
      pythonState.missingDeps = [];
      return { ok: true };
    }
    if (result.reason === 'missing_deps') {
      const missing = result.missingDeps || [];
      pythonState.missingDeps = missing;
      return { ok: false, missingDeps: missing };
    }
    return { ok: false, error: t('settings.pythonVerifyFail') };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};

// 自动检测 Python：检测成功后顺带校验基本依赖；未检测到则不校验
const autoDetectPython = async () => {
  if (detectBusy.value) return;
  pythonState.detecting = true;
  try {
    const result = await electronService.invoke('python-autodetect');
    if (!result.ok) {
      // 未检测到 Python，不校验依赖
      await notifyWarning(t('settings.pythonDetectFail'));
      return;
    }
    // 写回配置并刷新状态
    await electronService.invoke('python-set-path', { path: result.path });
    await loadPythonStatus();
    // Python 已就绪，继续校验基本依赖
    pythonState.detecting = false;
    pythonState.verifying = true;
    const depResult = await verifyPythonDepsInternal();
    if (depResult.ok) {
      await notifySuccess(t('settings.pythonDetectOkDepsOk'), { details: result.path });
    } else if (depResult.missingDeps && depResult.missingDeps.length) {
      await notifyWarning(t('settings.pythonDetectOkDepsMissing'), {
        details: `${t('settings.pythonMissingDeps')}（${depResult.missingDeps.length}）：${depResult.missingDeps.join(', ')}`
      });
    } else {
      await notifyWarning(t('settings.pythonDetectOkDepsFail'), { details: result.path });
    }
  } catch (e) {
    await notifyError(t('settings.pythonDetectFail') + ': ' + e);
  } finally {
    pythonState.detecting = false;
    pythonState.verifying = false;
  }
};

const selectPythonFile = async () => {
  try {
    const result = await electronService.invoke('python-select-file');
    if (!result.success) return;
    if (!result.ok) {
      const go = await confirmDialog(t('settings.pythonInvalidVersion'));
      if (!go) return;
    }
    await electronService.invoke('python-set-path', { path: result.path });
    await loadPythonStatus();
  } catch (e) {
    await notifyError(t('settings.pythonSelectFail') + ': ' + e);
  }
};

// ========== RAG 知识检索 ==========
const ragState = reactive({
  updating: false,
  progress: '',
  progressText: '',
  fileName: '',
  currentChunk: 0,
  totalChunks: 0,
  kbIndex: 0,
  kbCount: 0,
  current: 0,
  total: 0,
  failedCount: 0,
  phase: ''
});

const ragStats = ref({});

const KB_TYPE_LABELS = computed(() => ({
  personal: t('settings.kbPersonal'),
  local: t('settings.kbLocal')
}));

function kbTypeLabel(kbType) {
  return KB_TYPE_LABELS.value[kbType] || kbType;
}

// 进度主标签：知识库名称（第几个/共几个）
const ragProgressMainLabel = computed(() => {
  if (!ragState.progressText) return t('settings.preparing');
  const label = kbTypeLabel(ragState.progressText);
  if (ragState.kbCount > 0) {
    return `${label}（${ragState.kbIndex}/${ragState.kbCount}）`;
  }
  return label;
});

const loadRagStats = async () => {
  try {
    const result = await electronService.invoke('rag-get-kb-summary', {});
    if (result && result.success) {
      ragStats.value = result.summary || {};
    }
  } catch (e) {
    console.error('加载 RAG 统计失败:', e);
  }
};

const handleRagUpdate = async () => {
  if (ragState.updating) return;
  ragState.updating = true;
  ragState.progress = t('settings.preparing');
  ragState.progressText = '';
  ragState.fileName = '';
  ragState.currentChunk = 0;
  ragState.totalChunks = 0;
  ragState.kbIndex = 0;
  ragState.kbCount = 0;
  ragState.current = 0;
  ragState.total = 0;
  ragState.failedCount = 0;
  ragState.phase = 'preparing';

  // 监听进度事件（on 返回 unsubscribe 函数）
  let unsubProgress = null;
  let unsubDone = null;
  if (window.electronAPI) {
    unsubProgress = window.electronAPI.on('rag-update-progress', (progress) => {
      ragState.progressText = progress.kbType || '';
      ragState.kbIndex = progress.kbIndex || 0;
      ragState.kbCount = progress.kbCount || 0;

      switch (progress.phase) {
        case 'scanned':
          ragState.phase = 'scanned';
          ragState.total = progress.changedCount || 0;
          ragState.fileName = '';
          ragState.totalChunks = 0;
          if ((progress.changedCount || 0) === 0) {
            ragState.progress = t('settings.noChanges');
          } else {
            ragState.progress = `${t('settings.scanned')} ${progress.total || 0} · ${t('settings.pending')} ${progress.changedCount || 0}`;
          }
          break;
        case 'indexing':
          ragState.phase = 'indexing';
          ragState.current = progress.current || 0;
          ragState.total = progress.total || 0;
          ragState.fileName = progress.fileName || '';
          ragState.currentChunk = progress.currentChunk || 0;
          ragState.totalChunks = progress.totalChunks || 0;
          ragState.progress = `${progress.current || 0}/${progress.total || 0}`;
          break;
        case 'indexed':
          ragState.phase = 'indexed';
          ragState.current = progress.current || 0;
          ragState.total = progress.total || 0;
          ragState.fileName = progress.fileName || '';
          ragState.progress = `${progress.current || 0}/${progress.total || 0}`;
          break;
        case 'failed':
          ragState.phase = 'failed';
          ragState.failedCount = (ragState.failedCount || 0) + 1;
          ragState.current = progress.current || 0;
          ragState.total = progress.total || 0;
          ragState.fileName = progress.fileName || '';
          ragState.progress = `${progress.current || 0}/${progress.total || 0}`;
          break;
        case 'optimizing':
          ragState.phase = 'optimizing';
          ragState.fileName = '';
          ragState.totalChunks = 0;
          ragState.progress = t('settings.optimizing');
          break;
      }
    });
    unsubDone = window.electronAPI.on('rag-update-done', () => {
      if (unsubProgress) unsubProgress();
      if (unsubDone) unsubDone();
    });
  }

  try {
    const result = await electronService.invoke('rag-manual-update', {});
    if (result && result.success) {
      const failedTotal = Object.values(result.results || {}).reduce((s, r) => s + (r.failed || 0), 0);
      const changedTotal = Object.values(result.results || {}).reduce((s, r) => s + (r.changed || 0), 0);
      if (failedTotal > 0) {
        ragState.progress = `${t('settings.complete')} · ${t('settings.failed')}: ${failedTotal}/${changedTotal}`;
      } else if (changedTotal === 0) {
        ragState.progress = t('settings.noChanges');
      } else {
        ragState.progress = `${t('settings.complete')} · ${changedTotal}`;
      }
      ragState.phase = 'done';
      ragState.fileName = '';
      ragState.totalChunks = 0;
      await loadRagStats();
    } else {
      ragState.progress = t('settings.failed') + ': ' + (result?.error || t('settings.unknownError'));
      ragState.phase = 'error';
    }
  } catch (e) {
    ragState.progress = t('settings.failed') + ': ' + e.message;
    ragState.phase = 'error';
  } finally {
    ragState.updating = false;
    // 5 秒后清空进度
    setTimeout(() => {
      ragState.progress = '';
      ragState.progressText = '';
      ragState.fileName = '';
      ragState.phase = '';
      ragState.totalChunks = 0;
    }, 5000);
  }
};

const toggleThemeDropdown = () => {
  showThemeDropdown.value = !showThemeDropdown.value;
};

const selectTheme = async (value) => {
  settings.displayMode = value;
  applyTheme(value);
  appStore.setTheme(value);
  showThemeDropdown.value = false;
  // 持久化到 config.json，与 language 等设置保持一致。
  // 否则 config.theme 会一直停留在默认 'light'，后续 config-changed 广播时
  // 会用过期的 theme 覆盖用户当前主题（深色被强制切回浅色）。
  try {
    const config = await electronService.invoke('get-config');
    if (config) {
      config.theme = value;
      await electronService.invoke('save-config', config);
    }
  } catch (_e) {}
};

const toggleLangDropdown = () => {
  showLangDropdown.value = !showLangDropdown.value;
};

const selectLanguage = async (value) => {
  currentLanguage.value = value;
  appStore.setLanguage(value);
  setI18nLanguage(value);
  showLangDropdown.value = false;
  try {
    const config = await electronService.invoke('get-config');
    if (config) {
      config.language = value;
      await electronService.invoke('save-config', config);
    }
  } catch (_e) {}
};

const saveNoteFimCompletion = async () => {
  appStore.setNoteFimCompletion(settings.noteFimCompletion);
  try {
    const config = await electronService.invoke('get-config');
    if (config) {
      config.noteFimCompletion = settings.noteFimCompletion;
      await electronService.invoke('save-config', config);
    }
  } catch (_e) {}
};

const saveRuntimeLogsConfig = async () => {
  const nextValue = runtimeLogsEnabled.value;
  try {
    const config = await electronService.invoke('get-config');
    if (!config) throw new Error('Failed to load config');
    config.runtimeLogsEnabled = nextValue;
    const result = await electronService.invoke('save-config', config);
    if (result?.success === false) throw new Error(result.error || 'Failed to save config');
  } catch (e) {
    runtimeLogsEnabled.value = !nextValue;
    notifyError(e.message || t('settings.runtimeLogsSaveFailed'));
  }
};

const selectScheduleView = async (value) => {
  if (value !== 'week' && value !== 'month') return;
  settings.scheduleDefaultView = value;
  appStore.setScheduleDefaultView(value);
  try {
    const config = await electronService.invoke('get-config');
    if (config) {
      config.scheduleDefaultView = value;
      await electronService.invoke('save-config', config);
    }
  } catch (_e) {}
};

const handleClickOutside = (event) => {
  if (themeSelectRef.value && !themeSelectRef.value.contains(event.target)) {
    showThemeDropdown.value = false;
  }
  if (langSelectRef.value && !langSelectRef.value.contains(event.target)) {
    showLangDropdown.value = false;
  }
};

// 弹窗快捷键：Enter 确认 / Esc 取消
const handleKeydown = (e) => {
  if (!dialog.visible) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    handleDialogCancel();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    handleDialogConfirm();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
  initTheme();
  loadPetSettings();
  loadSystemTools();
  loadBuiltinRuntime();
  settings.displayMode = currentMode.value;
  currentLanguage.value = appStore.language || 'zh-CN';
  electronService.invoke('get-config').then((config) => {
    if (config) {
      runtimeLogsEnabled.value = config.runtimeLogsEnabled !== false;
      appStore.setSidebarModules(config.sidebarModules);
      // 回填已保存的 QQ 机器人配置
      const qb = (config.bridge && config.bridge.qqbot) || {};
      if (qb.appid) qqbotAppid.value = qb.appid;
      if (qb.secret) qqbotSecret.value = qb.secret;
      if (qb.token) qqbotToken.value = qb.token;
      if (qb.apiBase) qqbotApiBase.value = qb.apiBase;
      if (qb.gatewayUrl) qqbotGateway.value = qb.gatewayUrl;
    }
  });
  loadBackupConfig();
  loadHistoryConfig();
  loadHarnessWorkspace();
  loadRagStats();
  loadPythonStatus();
  // 订阅备份进度事件（主进程 worker 推送）
  if (window.electronAPI) {
    unsubBackupProgress = window.electronAPI.on('backup-progress', handleBackupProgress);
    // 订阅 QQ 二维码推送（主进程生成后立即发送，不依赖轮询）
    unsubQrPush = electronService.listen('bridge-qq-qr', ({ payload }) => {
      qqQrcode.value = payload || null;
      if (payload) stopQrPoll();
    });
    // 订阅 QQ 官方机器人连接状态
    qqbotStatusUnsub = electronService.listen('bridge-qqbot-status', ({ payload }) => {
      qqbotOn.value = !!payload;
    });
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
  if (unsubBackupProgress) unsubBackupProgress();
  if (unsubQrPush) unsubQrPush();
  if (qqbotStatusUnsub) qqbotStatusUnsub();
  stopQrPoll();
});

onDeactivated(() => {
  showThemeDropdown.value = false;
  showLangDropdown.value = false;
});

const goToModelSettings = () => {
  router.push('/settings/model');
};

const goToModuleSettings = () => {
  router.push('/settings/modules');
};

// ========== 关于 / 功能介绍 / 帮助与反馈 ==========

// ========== 远程开机（WoL） ==========
const wolComputers = ref([]);
const wolNew = reactive({ name: '', mac: '', broadcast: '255.255.255.255' });

async function loadWolComputers() {
  const list = await electronService.invoke('wol-get-computers');
  if (list) wolComputers.value = list;
}

async function wolAdd() {
  if (!wolNew.name.trim() || !wolNew.mac.trim()) return;
  wolComputers.value.push({
    id: Date.now().toString(),
    name: wolNew.name.trim(),
    mac: wolNew.mac.trim().toUpperCase(),
    broadcast: wolNew.broadcast.trim() || '255.255.255.255'
  });
  await electronService.invoke('wol-save-computers', wolComputers.value);
  wolNew.name = '';
  wolNew.mac = '';
  wolNew.broadcast = '255.255.255.255';
}

async function wolRemove(idx) {
  wolComputers.value.splice(idx, 1);
  await electronService.invoke('wol-save-computers', wolComputers.value);
}

async function wolSend(pc) {
  try {
    await electronService.invoke('wol-send', { mac: pc.mac, broadcast: pc.broadcast });
    alert(`已发送开机指令到「${pc.name}」`);
  } catch (e) {
    alert(`发送失败: ${e.message || e}`);
  }
}

onMounted(() => {
  loadWolComputers();
});

// ========== 关于 / 功能介绍 / 帮助与反馈 ==========
const HELP_URL = 'https://github.com/shangpan666/friendly-octo-spork';

const showAboutModal = ref(false);
const showFeaturesModal = ref(false);
const showAuthorModal = ref(false);

const appVersion = packageJson.version;

const features = computed(() => [
  {
    title: t('settings.featureSmartNote'),
    desc: t('settings.featureSmartNoteDesc'),
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line>'
  },
  {
    title: t('settings.featureRag'),
    desc: t('settings.featureRagDesc'),
    icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>'
  },
  {
    title: t('settings.featureAiAssistant'),
    desc: t('settings.featureAiAssistantDesc'),
    icon: '<circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line>'
  },
  {
    title: t('settings.featureMultiModel'),
    desc: t('settings.featureMultiModelDesc'),
    icon: '<path d="M12 2a10 10 0 1 0 10 10"></path><path d="M12 6v6l4 2"></path>'
  },
  {
    title: t('settings.featureBackup'),
    desc: t('settings.featureBackupDesc'),
    icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>'
  },
  {
    title: t('settings.featureAgent'),
    desc: t('settings.featureAgentDesc'),
    icon: '<rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line>'
  }
]);

const openHelpUrl = () => {
  electronService.invoke('open-external', HELP_URL);
};

// 打开运行日志所在目录（系统文件管理器）
const openLogDir = async () => {
  const res = await electronService.invoke('logs-open-dir');
  if (!res || res.success === false) {
    notifyError(res?.error || t('settings.openLogDirFailed'));
  }
};

const checkForUpdate = () => {
  electronService.invoke('open-external', `${HELP_URL}/releases`);
};

const openAuthorHomepage = () => {
  electronService.invoke('open-external', 'https://github.com/shangpan666/friendly-octo-spork');
};

const isElectronWin32 = computed(
  () => typeof window !== 'undefined' && !!window.electronAPI?.isElectron && typeof process !== 'undefined' && process.platform === 'win32'
);

// ========== 直接连接（内嵌微信 / QQ 机器人） ==========
const wechatOn = ref(false);
const qqOn = ref(false);
const directBusy = ref(false);
const qqQrcode = ref(null);
const qqPollTimer = null;

// QQ 官方机器人（开放平台，合规）
const qqbotAppid = ref('');
const qqbotSecret = ref('');
const qqbotToken = ref('');
const qqbotApiBase = ref('https://api.bot.qq.com');
const qqbotGateway = ref('');
const qqbotOn = ref(false);
let qqbotStatusUnsub = null;

const refreshDirectStatus = async () => {
  try {
    const status = await electronService.invoke('bridge-get-status');
    wechatOn.value = !!status?.wechat;
    qqOn.value = !!status?.qq;
    if (!qqOn.value) {
      const qr = await electronService.invoke('bridge-qq-qr');
      qqQrcode.value = qr?.qrcode || null;
    } else {
      qqQrcode.value = null;
    }
  } catch (_e) {
    // 忽略
  }
};

const startQrPoll = () => {
  stopQrPoll();
  qqPollTimer = setInterval(async () => {
    try {
      const status = await electronService.invoke('bridge-get-status');
      qqOn.value = !!status?.qq;
      if (qqOn.value) {
        qqQrcode.value = null;
        stopQrPoll();
        return;
      }
      const qr = await electronService.invoke('bridge-qq-qr');
      qqQrcode.value = qr?.qrcode || null;
    } catch (_e) {
      // 忽略
    }
  }, 1500);
};
const stopQrPoll = () => {
  if (qqPollTimer) {
    clearInterval(qqPollTimer);
    qqPollTimer = null;
  }
};

const startWechat = async () => {
  if (directBusy.value) return;
  directBusy.value = true;
  try {
    const res = await electronService.invoke('bridge-wechat-start');
    if (res?.success) {
      wechatOn.value = !!res.status?.wechat;
      await notifySuccess(t('settings.directWechatConnected'));
    } else {
      await notifyError(t('settings.directStartFailed') + ': ' + (res?.error || ''));
    }
  } catch (e) {
    await notifyError(t('settings.directStartFailed') + ': ' + e);
  } finally {
    directBusy.value = false;
    await refreshDirectStatus();
  }
};
const stopWechat = async () => {
  if (directBusy.value) return;
  directBusy.value = true;
  try {
    const res = await electronService.invoke('bridge-wechat-stop');
    if (res?.success) wechatOn.value = false;
    else await notifyError(t('settings.directStopFailed') + ': ' + (res?.error || ''));
  } catch (e) {
    await notifyError(t('settings.directStopFailed') + ': ' + e);
  } finally {
    directBusy.value = false;
  }
};
const startQQ = async () => {
  if (directBusy.value) return;
  directBusy.value = true;
  qqQrcode.value = null;
  try {
    const res = await electronService.invoke('bridge-qq-start');
    if (res?.success) {
      await notifySuccess(t('settings.directQQScanHint'));
      startQrPoll();
    } else {
      await notifyError(t('settings.directStartFailed') + ': ' + (res?.error || ''));
    }
  } catch (e) {
    await notifyError(t('settings.directStartFailed') + ': ' + e);
  } finally {
    directBusy.value = false;
    await refreshDirectStatus();
  }
};
const stopQQ = async () => {
  if (directBusy.value) return;
  directBusy.value = true;
  stopQrPoll();
  try {
    const res = await electronService.invoke('bridge-qq-stop');
    if (res?.success) {
      qqOn.value = false;
      qqQrcode.value = null;
    } else {
      await notifyError(t('settings.directStopFailed') + ': ' + (res?.error || ''));
    }
  } catch (e) {
    await notifyError(t('settings.directStopFailed') + ': ' + e);
  } finally {
    directBusy.value = false;
  }
};
</script>

<style scoped>
.settings-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 40px;
}

.settings-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 28px;
  max-width: 720px;
  width: 100%;
  text-align: left;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 720px;
  width: 100%;
}

.settings-group {
  background-color: var(--bg-primary);
}

.group-title {
  font-size: 14px;
  color: var(--text-tertiary);
  padding: 16px 0 10px;
  font-weight: 400;
}

.group-content {
  background-color: var(--bg-secondary);
  border-radius: 10px;
}

.group-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
  margin-bottom: 8px;
  line-height: 1.4;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color);
  min-height: 52px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item.clickable {
  cursor: pointer;
}

.setting-item.runtime-header {
  justify-content: flex-start;
}

.runtime-col-tool {
  min-width: 80px;
  flex-shrink: 0;
}

.runtime-col-desc {
  flex: 1;
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 400;
  margin-left: 16px;
}

.runtime-col-status {
  flex-shrink: 0;
  margin-left: 16px;
}

.item-label {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.item-label-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-right: 16px;
}

.item-action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.item-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 400;
  line-height: 1.4;
}

.theme-select-wrapper {
  position: relative;
  flex: 1;
  max-width: 140px;
}

.theme-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.theme-select-trigger:hover {
  background-color: var(--bg-hover);
}

.theme-select-arrow {
  color: var(--text-tertiary);
  transition: transform 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;
}

.theme-select-arrow.expanded {
  transform: rotate(180deg);
}

.theme-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 100;
  animation: themeDropdownIn 0.2s ease;
}

@keyframes themeDropdownIn {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.theme-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  border-radius: 10px;
  transition: background-color 0.15s;
  font-size: 14px;
  color: var(--text-primary);
}

.theme-dropdown-item:hover {
  background-color: var(--bg-hover);
}

.theme-dropdown-item.active {
  background-color: var(--accent-light);
}

.check-icon {
  flex-shrink: 0;
}

.font-size-options {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 4px;
}

.font-size-option {
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.font-size-option:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
}

.font-size-option.active {
  background-color: var(--text-primary);
  color: var(--bg-primary);
  font-weight: 500;
}

.item-options {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 4px;
}

.item-toggle {
  display: flex;
  align-items: center;
}

.item-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.text-input {
  width: 200px;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
}

.text-input:focus {
  border-color: var(--text-tertiary);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--text-tertiary);
  border-radius: 8px;
  transition: background-color 0.25s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: var(--bg-primary);
  border-radius: 50%;
  transition: transform 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--success-color);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.item-link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.item-link svg {
  color: var(--text-tertiary);
}

.action-btn {
  background-color: var(--text-primary);
  color: var(--bg-primary);
  border: none;
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
  transition: opacity 0.15s;
}

.action-btn:hover {
  opacity: 0.85;
}

.arrow-icon {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.text-btn {
  background-color: transparent;
  color: var(--text-primary);
  border: none;
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
}

.text-btn:hover {
  background-color: var(--bg-hover);
}

.primary-btn {
  background-color: var(--text-primary);
  color: var(--bg-primary);
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
  transition: opacity 0.2s;
}

.primary-btn:hover {
  opacity: 0.85;
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.danger-btn {
  background-color: transparent;
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.2s;
}

.danger-btn:hover {
  background-color: rgba(239, 68, 68, 0.08);
}

.danger-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost-btn {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.2s;
}

.ghost-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost-btn.danger-btn {
  color: var(--danger-color);
  border-color: rgba(239, 68, 68, 0.4);
}

.ghost-btn.danger-btn:hover {
  background-color: rgba(239, 68, 68, 0.08);
}

/* RAG 索引统计 - 紧凑内联 */
.rag-stats-row {
  border-bottom: none;
  align-items: flex-start;
  flex-wrap: wrap;
}

.rag-stats-inline {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.rag-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-hover);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 12px;
  line-height: 1.4;
}

.rag-stat-kb {
  color: var(--text-tertiary);
  white-space: nowrap;
}

.rag-stat-detail {
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
}

.rag-stat-vectors {
  color: var(--text-tertiary);
  font-size: 11px;
  white-space: nowrap;
}

.rag-stat-chip.has-issues .rag-stat-detail,
.rag-stat-chip.has-issues .rag-stat-vectors {
  color: #f59e0b;
}

/* RAG 索引进度 */
.rag-progress-item {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}

.rag-progress-content {
  width: 100%;
}

.rag-progress-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rag-progress-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.rag-progress-file {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.rag-progress-meta {
  white-space: nowrap;
  flex-shrink: 0;
}

.rag-progress-failed {
  color: #f59e0b;
}

/* 作者介绍弹窗 */
.author-modal {
  position: relative;
  background-color: var(--bg-primary);
  border-radius: 8px;
  width: 90%;
  max-width: 420px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
  animation: infoSlideUp 0.25s ease;
  overflow: hidden;
}

.author-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  transition: background-color 0.15s, color 0.15s;
}

.author-modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 内容区 */
.author-content {
  padding: 26px 26px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.author-name-lg {
  font-size: 19px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.author-subtitle {
  font-size: 12.5px;
  color: var(--text-tertiary);
  margin: -8px 0 0;
}

.author-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.author-block-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
}

.author-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.65;
  margin: 0;
}

.author-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0 -26px;
}

.author-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--accent-color);
  cursor: pointer;
  align-self: flex-start;
}

.author-link:hover {
  text-decoration: underline;
}

/* 关于 / 功能介绍 弹窗 */
.info-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: infoFadeIn 0.2s ease;
}

@keyframes infoFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.info-modal-container {
  position: relative;
  background-color: var(--bg-primary);
  border-radius: 14px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: infoSlideUp 0.25s ease;
  overflow: hidden;
}

.info-modal-wide {
  max-width: 580px;
}

@keyframes infoSlideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.info-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  transition: color 0.15s;
  border-radius: 4px;
  z-index: 1;
}

.info-modal-close:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
}

.info-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.info-modal-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* 关于弹窗内容 */
.about-modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36px 28px 28px;
  text-align: center;
}

.about-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.about-version {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0 0 18px;
}

.about-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 20px;
}

.about-links {
  display: flex;
  gap: 16px;
}

.about-link {
  font-size: 13px;
  color: var(--accent-color);
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.15s;
}

.about-link:hover {
  opacity: 0.8;
}

/* 功能介绍弹窗内容 */
.features-modal-body {
  padding: 12px 16px 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.feature-item {
  display: flex;
  gap: 12px;
  padding: 10px 6px;
}

.feature-item + .feature-item {
  border-top: 1px solid var(--border-color);
}

.feature-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.feature-icon svg {
  width: 17px;
  height: 17px;
}

.feature-text {
  flex: 1;
  min-width: 0;
}

.feature-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.feature-desc {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.55;
}

/* 桌面宠物 */
.pet-avatar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pet-avatar-preview {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

.pet-mini-btn {
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}

.pet-mini-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.hidden-input {
  display: none;
}

/* Harness 工作区 */
.harness-workspace-path {
  max-width: 360px;
  overflow-wrap: anywhere;
  text-align: right;
}

.harness-workspace-path.copyable {
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}

.harness-workspace-path.copyable:hover {
  color: var(--text-primary);
}

.setting-item-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.harness-workspace-error {
  padding-top: 0;
}

.harness-workspace-error .error-message {
  color: var(--error-color, #e5484d);
  font-size: 12.5px;
}

/* 运行日志 */
.logs-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 24px;
}

.logs-actions .text-btn {
  height: 24px;
  padding-top: 0;
  padding-bottom: 0;
  line-height: 24px;
}

[data-theme='dark'] .theme-dropdown-menu {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}

[data-theme='dark'] .info-modal-container {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

[data-theme='dark'] .author-modal {
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

/* Python 环境设置区块 */
.python-ok {
  color: var(--success-color);
  font-weight: 500;
}

.python-warn {
  color: var(--danger-color);
  font-weight: 500;
}

/* 备份进度条 */
.backup-progress-item {
  flex-direction: column;
  align-items: stretch;
  padding-top: 4px;
}

.backup-progress-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.backup-progress-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.backup-progress-bar {
  width: 100%;
  height: 6px;
  border-radius: 6px;
  background: var(--bg-hover);
  overflow: hidden;
}

.backup-progress-fill {
  height: 100%;
  border-radius: 6px;
  background: var(--success-color);
  transition: width 0.25s ease;
}

.backup-progress-file {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: inherit;
}

/* 通用提示弹窗（替代原生 alert/confirm） */
.appdlg-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.appdlg-card {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 30px 30px 22px;
  width: 400px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.18),
    0 8px 24px rgba(0, 0, 0, 0.1),
    0 0 0 1px var(--border-color);
}

.appdlg-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-bottom: 2px;
}

.appdlg-card.is-success .appdlg-icon {
  background: rgba(26, 127, 55, 0.1);
  color: var(--success-color);
}

.appdlg-card.is-error .appdlg-icon {
  background: rgba(207, 34, 46, 0.1);
  color: var(--danger-color);
}

.appdlg-card.is-warning .appdlg-icon,
.appdlg-card.is-confirm .appdlg-icon {
  background: rgba(154, 103, 0, 0.1);
  color: var(--warning-color);
}

.appdlg-card.is-info .appdlg-icon {
  background: var(--accent-light);
  color: var(--accent-color);
}

.appdlg-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin: 0;
  letter-spacing: -0.01em;
}

.appdlg-message {
  font-size: 13.5px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.65;
  margin: 0;
  padding: 0 8px;
  word-break: break-word;
}

.appdlg-details {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
  word-break: break-all;
  white-space: pre-wrap;
  font-family: inherit;
}

.appdlg-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 6px;
}

.appdlg-btn {
  flex: 1;
  padding: 11px 0;
  border: none;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.appdlg-cancel {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.appdlg-cancel:hover {
  background: var(--bg-active);
}

.appdlg-btn:active {
  transform: scale(0.97);
}

.appdlg-confirm {
  background: var(--success-color);
  color: #ffffff;
}

.appdlg-confirm:hover {
  filter: brightness(0.95);
}

.is-error .appdlg-confirm {
  background: var(--danger-color);
}
.is-error .appdlg-confirm:hover {
  filter: brightness(0.95);
}

.is-warning .appdlg-confirm {
  background: var(--warning-color);
}
.is-warning .appdlg-confirm:hover {
  filter: brightness(0.95);
}

.is-confirm .appdlg-confirm {
  background: var(--accent-color);
}
.is-confirm .appdlg-confirm:hover {
  filter: brightness(0.95);
}

[data-theme='dark'] .appdlg-card {
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-color);
}

.appdlg-fade-enter-active,
.appdlg-fade-leave-active {
  transition: opacity 0.2s ease;
}
.appdlg-fade-enter-from,
.appdlg-fade-leave-to {
  opacity: 0;
}

.appdlg-scale-enter-active {
  transition: all 0.28s cubic-bezier(0.2, 0, 0, 1);
}
.appdlg-scale-leave-active {
  transition: all 0.16s ease;
}
.appdlg-scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(8px);
}
.appdlg-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}
</style>
