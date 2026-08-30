<template>
  <Teleport to="body">
    <Transition name="quick-panel">
      <div v-if="visible" class="quick-search-panel" @click.self="close">
        <div class="panel-container">
          <div class="panel-header">
            <div class="panel-tabs">
              <button
                :class="['tab-btn', { active: activeTab === 'notes' }]"
                @click="activeTab = 'notes'"
              >
                <FileText :size="14" :stroke-width="1.8" />
                <span>笔记</span>
              </button>
              <button
                :class="['tab-btn', { active: activeTab === 'knowledge' }]"
                @click="activeTab = 'knowledge'"
              >
                <Database :size="14" :stroke-width="1.8" />
                <span>知识库</span>
              </button>
              <button
                :class="['tab-btn', { active: activeTab === 'code' }]"
                @click="activeTab = 'code'"
              >
                <Code :size="14" :stroke-width="1.8" />
                <span>代码</span>
              </button>
            </div>
            <button class="close-btn" @click="close">
              <X :size="16" :stroke-width="2" />
            </button>
          </div>

          <div class="search-box">
            <Search :size="16" :stroke-width="1.8" class="search-icon" />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              :placeholder="searchPlaceholder"
              class="search-input"
              @keydown.escape="close"
              @keydown.down="moveSelection(1)"
              @keydown.up="moveSelection(-1)"
              @keydown.enter="selectCurrent"
            />
            <span class="search-shortcut">ESC</span>
          </div>

          <div class="panel-results" v-if="searchQuery.trim()">
            <div v-if="loading" class="loading-state">
              <Loader2 :size="20" :stroke-width="1.8" class="spinner" />
              <span>搜索中...</span>
            </div>
            <div v-else-if="results.length === 0" class="empty-state">
              <SearchX :size="32" :stroke-width="1.2" />
              <span>未找到相关结果</span>
            </div>
            <div v-else class="results-list">
              <div
                v-for="(item, index) in results"
                :key="item.id"
                :class="['result-item', { selected: index === selectedIndex }]"
                @click="handleSelect(item)"
                @mouseenter="selectedIndex = index"
              >
                <div class="result-icon">
                  <component :is="getItemIcon(item)" :size="16" :stroke-width="1.6" />
                </div>
                <div class="result-content">
                  <div class="result-title">{{ item.title || item.name || '未命名' }}</div>
                  <div class="result-preview">{{ getPreview(item) }}</div>
                </div>
                <div class="result-meta">
                  <span v-if="item.updatedAt" class="result-time">{{ formatTime(item.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="panel-footer" v-else>
            <div class="footer-hints">
              <span class="hint-item">
                <kbd>↑↓</kbd> 导航
              </span>
              <span class="hint-item">
                <kbd>Enter</kbd> 打开
              </span>
              <span class="hint-item">
                <kbd>ESC</kbd> 关闭
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search, X, FileText, Database, Code, SearchX, Loader2
} from 'lucide-vue-next'
import { electronService } from '@/services/electron'

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible'])

const router = useRouter()
const searchInputRef = ref(null)
const searchQuery = ref('')
const activeTab = ref('notes')
const selectedIndex = ref(0)
const loading = ref(false)
const results = ref([])

const searchPlaceholder = computed(() => {
  const placeholders = {
    notes: '搜索笔记标题或内容...',
    knowledge: '搜索知识库文件...',
    code: '搜索代码片段...'
  }
  return placeholders[activeTab.value] || '搜索...'
})

let searchTimer = null

watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  selectedIndex.value = 0
  if (!searchQuery.value.trim()) {
    results.value = []
    return
  }
  searchTimer = setTimeout(() => performSearch(), 200)
})

watch(activeTab, () => {
  searchQuery.value = ''
  results.value = []
  nextTick(() => searchInputRef.value?.focus())
})

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => searchInputRef.value?.focus())
  }
})

async function performSearch() {
  const query = searchQuery.value.trim()
  if (!query) return

  loading.value = true
  try {
    if (activeTab.value === 'notes') {
      const notes = await electronService.invoke('search_notes', { query })
      results.value = (notes || []).map(n => ({
        ...n,
        type: 'note'
      }))
    } else if (activeTab.value === 'knowledge') {
      const kbs = await electronService.invoke('get-knowledge-bases')
      const allFiles = []
      for (const kb of (kbs || [])) {
        const files = await electronService.invoke('get-kb-files', { kbId: kb.id })
        for (const file of (files || [])) {
          allFiles.push({
            ...file,
            kbName: kb.name,
            kbId: kb.id,
            type: 'knowledge'
          })
        }
      }
      const q = query.toLowerCase()
      results.value = allFiles.filter(f =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.content || '').toLowerCase().includes(q)
      ).slice(0, 30)
    } else if (activeTab.value === 'code') {
      const notes = await electronService.invoke('search_notes', { query })
      const codeResults = (notes || [])
        .filter(n => {
          const ext = (n.title || '').split('.').pop()?.toLowerCase()
          return ['js', 'ts', 'py', 'java', 'cpp', 'c', 'rs', 'go', 'html', 'css', 'vue', 'jsx', 'tsx'].includes(ext)
        })
        .map(n => ({ ...n, type: 'code' }))
      results.value = codeResults
    }
  } catch (e) {
    console.error('Search error:', e)
    results.value = []
  } finally {
    loading.value = false
  }
}

function moveSelection(delta) {
  const len = results.value.length
  if (len === 0) return
  selectedIndex.value = (selectedIndex.value + delta + len) % len
}

function selectCurrent() {
  if (results.value.length > 0) {
    handleSelect(results.value[selectedIndex.value])
  }
}

function handleSelect(item) {
  close()
  if (item.type === 'note' || item.type === 'code') {
    router.push(`/note/${item.id}`)
  } else if (item.type === 'knowledge') {
    router.push(`/knowledge?kbId=${item.kbId}`)
  }
}

function getItemIcon(item) {
  if (item.type === 'knowledge') return Database
  return FileText
}

function getPreview(item) {
  if (item.contentText) {
    return item.contentText.slice(0, 80) + (item.contentText.length > 80 ? '...' : '')
  }
  if (item.content) {
    const text = item.content.replace(/<[^>]+>/g, '').slice(0, 80)
    return text + (text.length >= 80 ? '...' : '')
  }
  return item.kbName || ''
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

function close() {
  emit('update:visible', false)
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
    e.preventDefault()
    emit('update:visible', !props.visible)
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.quick-search-panel {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  padding-top: 15vh;
}

.panel-container {
  width: 520px;
  max-height: 480px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.panel-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 500;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.search-box {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  gap: 10px;
  border-bottom: 1px solid var(--border);
}

.search-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.search-shortcut {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.panel-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s ease;
}

.result-item:hover,
.result-item.selected {
  background: var(--bg-secondary);
}

.result-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 6px;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-top: 2px;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-preview {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-meta {
  flex-shrink: 0;
}

.result-time {
  font-size: 11px;
  color: var(--text-secondary);
}

.panel-footer {
  padding: 8px 14px;
  border-top: 1px solid var(--border);
}

.footer-hints {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.hint-item {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.hint-item kbd {
  font-size: 11px;
  background: var(--bg-secondary);
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--border);
}

/* 过渡动画 */
.quick-panel-enter-active,
.quick-panel-leave-active {
  transition: opacity 0.15s ease;
}

.quick-panel-enter-active .panel-container,
.quick-panel-leave-active .panel-container {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.quick-panel-enter-from,
.quick-panel-leave-to {
  opacity: 0;
}

.quick-panel-enter-from .panel-container,
.quick-panel-leave-to .panel-container {
  transform: scale(0.96) translateY(-10px);
  opacity: 0;
}
</style>
