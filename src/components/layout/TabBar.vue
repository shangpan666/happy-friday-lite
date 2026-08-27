<template>
  <div class="title-strip">
    <div v-if="isMac && !appStore.sidebarVisible" class="mac-traffic-lights-spacer"></div>
    <div v-if="!appStore.sidebarVisible" class="strip-left">
      <button class="strip-btn" @click="appStore.toggleSidebar()">
        <PanelLeftOpen :size="15" :stroke-width="1.8" />
      </button>
    </div>

    <div class="tabs-area" ref="tabsAreaRef">
      <div class="tabs-scroll" ref="tabsScrollRef" @wheel.prevent="onWheel">
        <template v-for="(tab, index) in tabStore.openedTabs" :key="tab.id">
          <span v-if="index > 0" :class="['tab-divider', { hidden: tabStore.activeTabId === tab.id || tabStore.openedTabs[index - 1]?.id === tabStore.activeTabId }]"></span>
          <div
            :class="['tab-item', { active: tabStore.activeTabId === tab.id }]"
            :style="{ width: tabWidth + 'px' }"
            role="tab"
            @click="switchTab(tab)"
            @contextmenu.prevent.stop="showContextMenu($event, tab)"
            @mouseenter="hoveredTabId = tab.id"
            @mouseleave="hoveredTabId = ''"
          >
            <component
              v-if="tab.icon"
              :is="iconMap[tab.icon]"
              :size="13"
              :stroke-width="2"
              class="tab-icon"
            />
            <span class="tab-title">{{ tab.title || t(tab.i18nKey) }}</span>
            <button v-show="(hoveredTabId === tab.id || tabStore.activeTabId === tab.id) && !(tabStore.openedTabs.length === 1 && tab.path === '/friday')" class="tab-close-btn" @click.stop="closeTab(tab.id)">
              <X :size="11" :stroke-width="2" />
            </button>
          </div>
        </template>
      </div>

      <button class="strip-btn add-tab-btn" @click="addFridayTab">
        <Plus :size="15" :stroke-width="2.2" />
      </button>

      <div class="tabs-area-spacer"></div>
    </div>

    <div v-if="!isMac" class="window-controls">
      <button class="win-ctrl-btn minimize-btn" @click="handleMinimize">
        <Minus :size="14" :stroke-width="1.5" />
      </button>
      <button class="win-ctrl-btn maximize-btn" @click="handleToggleMaximize">
        <Square :size="12" :stroke-width="1.5" />
      </button>
      <button class="win-ctrl-btn close-btn" @click="handleClose">
        <X :size="14" :stroke-width="1.5" />
      </button>
    </div>

    <div v-else class="strip-right-spacer"></div>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="tab-context-menu-overlay"
        @click="hideContextMenu"
        @contextmenu.prevent="hideContextMenu"
      >
        <div
          class="tab-context-menu"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
          role="menu"
          @click.stop
        >
          <button class="tab-context-menu-item" role="menuitem" :disabled="!canCloseOthers" @click="closeOtherTabs">
            <Layers :size="14" :stroke-width="1.8" />
            <span>关闭其他</span>
          </button>
          <button class="tab-context-menu-item" role="menuitem" @click="closeAllTabs">
            <X :size="14" :stroke-width="1.8" />
            <span>全部关闭</span>
          </button>
          <div class="tab-context-menu-divider"></div>
          <button class="tab-context-menu-item" role="menuitem" :disabled="!canMoveLeft" @click="moveContextTab(-1)">
            <ArrowLeft :size="14" :stroke-width="1.8" />
            <span>向左移动</span>
          </button>
          <button class="tab-context-menu-item" role="menuitem" :disabled="!canMoveRight" @click="moveContextTab(1)">
            <ArrowRight :size="14" :stroke-width="1.8" />
            <span>向右移动</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { useTabStore, useAppStore } from '@/store';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import {
  X,
  Plus,
  Minus,
  Square,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  ArrowRight,
  Layers,
  FolderKanban,
  FileText,
  CalendarDays,
  Workflow,
  BrainCircuit,
  Bot,
  Clock,
  Settings
} from 'lucide-vue-next';
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { electronService } from '@/services/electron';
import DeepSeekIcon from '@/components/icons/DeepSeekIcon.vue';

const tabStore = useTabStore();
const appStore = useAppStore();
const { t } = useI18n();
const router = useRouter();

const userAgent = navigator.userAgent || '';
const isMac = /Macintosh/.test(userAgent);

const iconMap = {
  FolderKanban,
  FileText,
  CalendarDays,
  Workflow,
  BrainCircuit,
  DeepSeekIcon,
  Bot,
  Clock,
  Settings
};

const tabsAreaRef = ref(null);
const tabsScrollRef = ref(null);
const tabsAreaWidth = ref(0);
const hoveredTabId = ref('');
const contextMenu = ref({ visible: false, x: 0, y: 0, tabId: '' });

const ADD_BTN_WIDTH = 26;
const TAB_GAP = 3;
const MAX_TAB_WIDTH = 160;
const MIN_TAB_WIDTH = 90;

const tabWidth = computed(() => {
  const count = tabStore.openedTabs.length;
  if (count === 0) return 0;
  const addBtnSpace = ADD_BTN_WIDTH + TAB_GAP;
  const availableForTabs = tabsAreaWidth.value - addBtnSpace;
  const totalGaps = (count - 1) * TAB_GAP;
  const width = (availableForTabs - totalGaps) / count;
  return Math.min(Math.max(width, MIN_TAB_WIDTH), MAX_TAB_WIDTH);
});

const contextTabIndex = computed(() => tabStore.openedTabs.findIndex(tab => tab.id === contextMenu.value.tabId));
const canCloseOthers = computed(() => tabStore.openedTabs.length > 1 && contextTabIndex.value !== -1);
const canMoveLeft = computed(() => contextTabIndex.value > 0);
const canMoveRight = computed(() => contextTabIndex.value !== -1 && contextTabIndex.value < tabStore.openedTabs.length - 1);

const scrollToActiveTab = () => {
  nextTick(() => {
    if (!tabsScrollRef.value) return;
    const activeEl = tabsScrollRef.value.querySelector('.tab-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  });
};

const scrollToEnd = () => {
  nextTick(() => {
    if (!tabsScrollRef.value) return;
    tabsScrollRef.value.scrollTo({ left: tabsScrollRef.value.scrollWidth, behavior: 'smooth' });
  });
};

watch(() => tabStore.activeTabId, scrollToActiveTab);
watch(() => tabStore.openedTabs.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    scrollToEnd();
  } else {
    nextTick(scrollToActiveTab);
  }
});

let resizeObserver = null;

onMounted(() => {
  if (tabsAreaRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        tabsAreaWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(tabsAreaRef.value);
    tabsAreaWidth.value = tabsAreaRef.value.getBoundingClientRect().width;
  }
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener('keydown', handleKeydown);
});

const switchTab = (tab) => {
  if (tabStore.activeTabId !== tab.id) {
    tabStore.setActiveTab(tab.id);
    router.push(tab.fullPath);
  }
};

const requestFridayClose = async (id) => {
  const event = new CustomEvent('friday-before-tab-close', {
    cancelable: true,
    detail: { tabId: id, promise: null }
  });
  const allowed = window.dispatchEvent(event);
  if (!allowed) {
    await event.detail.promise;
  }
  return allowed;
};

const closeTab = async (id) => {
  if (!(await requestFridayClose(id))) return;
  tabStore.removeTab(id);
  navigateToActiveTab();
};

const navigateToActiveTab = () => {
  const activeTab = tabStore.openedTabs.find(tab => tab.id === tabStore.activeTabId);
  if (activeTab) router.push(activeTab.fullPath);
};

const showContextMenu = (event, tab) => {
  const menuWidth = 118;
  const menuHeight = 144;
  contextMenu.value = {
    visible: true,
    x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
    tabId: tab.id
  };
};

const hideContextMenu = () => {
  contextMenu.value.visible = false;
};

const closeOtherTabs = () => {
  if (!canCloseOthers.value) return;
  tabStore.closeOtherTabs(contextMenu.value.tabId);
  hideContextMenu();
  navigateToActiveTab();
};

const closeAllTabs = () => {
  tabStore.closeAllTabs();
  hideContextMenu();
  navigateToActiveTab();
};

const moveContextTab = (direction) => {
  if (tabStore.moveTab(contextMenu.value.tabId, direction)) {
    hideContextMenu();
  }
};

const handleKeydown = (event) => {
  if (event.key === 'Escape') hideContextMenu();
};

const addFridayTab = () => {
  const tab = tabStore.addFridayTab();
  router.push(tab.fullPath);
};

const onWheel = (e) => {
  if (!tabsScrollRef.value) return;
  tabsScrollRef.value.scrollBy({ left: e.deltaY, behavior: 'auto' });
};

const handleMinimize = () => {
  electronService.send('window-minimize');
};

const handleToggleMaximize = () => {
  electronService.send('window-maximize');
};

const handleClose = () => {
  electronService.send('window-close');
};
</script>

<style scoped>
.title-strip {
  display: flex;
  align-items: stretch;
  height: var(--tab-bar-height);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -webkit-app-region: drag;
  app-region: drag;
  flex-shrink: 0;
}

.mac-traffic-lights-spacer {
  width: 80px;
  flex-shrink: 0;
}

.strip-left {
  display: flex;
  align-items: center;
  padding-left: 6px;
  flex-shrink: 0;
}

.strip-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: background-color 0.12s, color 0.12s;
  -webkit-app-region: no-drag;
  app-region: no-drag;
  flex-shrink: 0;
}

.strip-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.tabs-area {
  display: flex;
  align-items: stretch;
  gap: 2px;
  flex: 1;
  min-width: 0;
  -webkit-app-region: no-drag;
  app-region: no-drag;
  padding: 5px 4px 0;
}

.tabs-scroll {
  display: flex;
  align-items: flex-end;
  flex: 0 1 auto;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.tabs-scroll::-webkit-scrollbar {
  display: none;
}

.tab-divider {
  width: 1px;
  height: 14px;
  background-color: var(--border-strong);
  flex-shrink: 0;
  margin: 0 1px 6px;
  transition: opacity 0.12s;
}

.tab-divider.hidden {
  opacity: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  height: 26px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background-color 0.1s, color 0.1s;
  gap: 6px;
  flex-shrink: 0;
  font-size: 12px;
  overflow: hidden;
}

.tab-item:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.tab-item.active {
  background-color: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-primary);
  font-weight: 500;
  position: relative;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background-color: var(--bg-primary);
}

.tab-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  line-height: 1;
  -webkit-mask-image: linear-gradient(to right, #000 70%, transparent 100%);
  mask-image: linear-gradient(to right, #000 70%, transparent 100%);
}

.tab-close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  margin-left: 2px;
  border-radius: 3px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.12s, color 0.12s;
  flex-shrink: 0;
}

.tab-close-btn:hover {
  background-color: var(--bg-active);
  color: var(--text-primary);
}

.add-tab-btn {
  margin: 0 0 5px 2px;
  align-self: flex-end;
}

.tabs-area-spacer {
  flex: 1;
  min-width: 0;
  -webkit-app-region: drag;
  app-region: drag;
}

.strip-right-spacer {
  flex-shrink: 0;
  min-width: 50px;
}

.tab-context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.tab-context-menu {
  position: fixed;
  z-index: 2001;
  width: 118px;
  min-width: 118px;
  max-width: 118px;
  box-sizing: border-box;
  padding: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.tab-context-menu-item {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  white-space: nowrap;
  transition: background-color 0.12s, color 0.12s;
}

.tab-context-menu-item:hover:not(:disabled) {
  background: var(--bg-hover);
}

.tab-context-menu-item:disabled {
  color: var(--text-tertiary);
  cursor: default;
}

.tab-context-menu-divider {
  height: 1px;
  margin: 4px;
  background: var(--border-color);
}

.window-controls {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.win-ctrl-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  width: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  transition: background-color 0.1s;
}

.win-ctrl-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.close-btn:hover {
  background-color: var(--window-close-hover);
  color: var(--window-close-hover-text);
}
</style>
