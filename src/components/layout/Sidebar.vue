<template>
  <aside :class="['app-nav', { hidden: !appStore.sidebarVisible, 'is-mac': isMac }]">
    <div class="nav-inner">
      <div class="brand-row electron-drag-region">
        <span class="brand-name">Phronesis</span>
        <button class="brand-collapse-btn" @click="appStore.toggleSidebar()">
          <PanelLeftClose :size="15" :stroke-width="1.8" />
        </button>
      </div>

      <button class="new-chat-btn" @click="startNewChat">
        <Plus :size="15" :stroke-width="2.2" />
        <span>{{ t('common.action.newChat') }}</span>
      </button>

      <nav class="nav-scroll">
        <div class="nav-group-label">{{ t('common.nav.groupChat') }}</div>
        <router-link to="/friday" class="nav-item" active-class="active">
          <component :is="fridayMenuConfig.iconComponent" :size="16" :stroke-width="1.7" />
          <span class="nav-item-label">{{ t(fridayMenuConfig.i18nKey) }}</span>
        </router-link>
        <router-link
          v-if="isModuleVisible(bottomItemByKey('history'))"
          to="/history"
          class="nav-item"
          active-class="active"
        >
          <component :is="bottomItemByKey('history').iconComponent" :size="16" :stroke-width="1.7" />
          <span class="nav-item-label">{{ t(bottomItemByKey('history').i18nKey) }}</span>
        </router-link>

        <div class="nav-group-label">{{ t('common.nav.groupWorkspace') }}</div>
        <router-link
          v-for="item in visibleSidebarMenuConfig"
          :key="item.key"
          :to="item.path"
          class="nav-item"
          active-class="active"
        >
          <component :is="item.iconComponent" :size="16" :stroke-width="1.7" />
          <span class="nav-item-label">{{ t(item.i18nKey) }}</span>
        </router-link>
      </nav>

      <div class="nav-footer">
        <div class="footer-row">
          <button ref="avatarBtnRef" class="user-card" :class="{ active: showDrawer }" @click="toggleDrawer">
            <span class="user-avatar-wrap">
              <img :src="avatarSrc" alt="avatar" class="user-avatar" />
              <span class="user-status"></span>
            </span>
            <span class="user-name">{{ t('common.user.name') }}</span>
          </button>

          <button
            class="mobile-connect-btn"
            title="手机连接"
            @click="showMobilePanel = true"
          >
            <Smartphone :size="16" :stroke-width="1.7" />
          </button>

          <button
            class="quick-search-btn"
            title="快速搜索 (Ctrl+Space)"
            @click="$emit('openQuickSearch')"
          >
            <Search :size="16" :stroke-width="1.7" />
          </button>

          <router-link
            to="/account"
            class="settings-btn"
            active-class="active"
            title="账号"
          >
            <User :size="16" :stroke-width="1.7" />
          </router-link>

          <router-link
            v-if="isModuleVisible(bottomItemByKey('settings'))"
            to="/settings"
            class="settings-btn"
            active-class="active"
            :title="t(bottomItemByKey('settings').i18nKey)"
          >
            <component :is="bottomItemByKey('settings').iconComponent" :size="16" :stroke-width="1.7" />
          </router-link>
        </div>
      </div>
    </div>

    <AvatarDrawer v-model="showDrawer" />
    <MobileConnectPanel :visible="showMobilePanel" @close="showMobilePanel = false" />
  </aside>
</template>

<script setup>
defineEmits(['openQuickSearch']);
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore, useTabStore } from '@/store';
import { useI18n } from 'vue-i18n';
import { Plus, PanelLeftClose, Smartphone, Search, User } from 'lucide-vue-next';
import {
  sidebarMenuConfig,
  sidebarBottomMenuConfig,
  fridayMenuConfig
} from '@/config/menu';
import AvatarDrawer from './AvatarDrawer.vue';
import MobileConnectPanel from '@/components/mobile/MobileConnectPanel.vue';

const appStore = useAppStore();
const tabStore = useTabStore();
const router = useRouter();
const { t } = useI18n();
const showMobilePanel = ref(false);

const isModuleVisible = (item) => item.key === 'settings' || appStore.sidebarModules[item.key] !== false;
const visibleSidebarMenuConfig = computed(() => sidebarMenuConfig.filter(isModuleVisible));
const bottomItemByKey = (key) => sidebarBottomMenuConfig.find((item) => item.key === key);

const userAgent = navigator.userAgent || '';
const isMac = /Macintosh/.test(userAgent);

const defaultAvatar = `${import.meta.env.BASE_URL}images/icon.png`;

// 头像跟随「助手资料」设置
const readLocalProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('phronesis-assistant-profile') || 'null');
  } catch (_e) {
    return null;
  }
};
const assistantProfile = ref(readLocalProfile());
const avatarSrc = computed(() => assistantProfile.value?.avatar || defaultAvatar);

const loadAssistantProfile = async () => {
  try {
    const config = await window.electronAPI?.invoke('get-config');
    if (config?.assistantProfile) assistantProfile.value = config.assistantProfile;
  } catch (_e) {}
};

const onProfileChanged = () => {
  assistantProfile.value = readLocalProfile();
};

const startNewChat = () => {
  const tab = tabStore.addFridayTab();
  router.push(tab.fullPath);
};

const showDrawer = ref(false);

const toggleDrawer = () => {
  showDrawer.value = !showDrawer.value;
};

const onRouteChange = () => {
  showDrawer.value = false;
};

onMounted(() => {
  router.afterEach(onRouteChange);
  window.addEventListener('assistant-profile-changed', onProfileChanged);
  loadAssistantProfile();
});

onUnmounted(() => {
  window.removeEventListener('assistant-profile-changed', onProfileChanged);
});
</script>

<style scoped>
.app-nav {
  width: var(--sidebar-width);
  height: 100%;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.app-nav.hidden {
  width: 0;
  border-right-color: transparent;
}

.nav-inner {
  width: var(--sidebar-width);
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 10px 10px;
}

.brand-row {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px;
  flex-shrink: 0;
  -webkit-app-region: drag;
  app-region: drag;
}

.brand-collapse-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-tertiary);
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

.brand-collapse-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.app-nav.is-mac .brand-row {
  padding-left: 80px;
}

.brand-name {
  font-family: "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive;
  font-size: 16px;
  font-weight: 400;
  color: var(--text-primary);
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 32px;
  margin: 2px 0 12px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent-color);
  color: var(--accent-text-on);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.12s;
}

.new-chat-btn:hover {
  background: var(--accent-hover);
}

.nav-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-bottom: 8px;
}

.nav-group-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
  padding: 12px 8px 4px;
  letter-spacing: 0.3px;
  user-select: none;
  -webkit-user-select: none;
}

.nav-group-label:first-child {
  padding-top: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 30px;
  padding: 0 8px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
  flex-shrink: 0;
  transition: background-color 0.1s, color 0.1s;
}

.nav-item:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background-color: var(--bg-active);
  color: var(--text-primary);
  font-weight: 500;
}

.nav-item.active svg {
  color: var(--accent-color);
}

.nav-item-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.nav-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--border-color);
  padding-top: 6px;
}

.footer-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 36px;
  flex: 1;
  min-width: 0;
  padding: 0 8px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.1s;
}

.user-card:hover,
.user-card.active {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: background-color 0.1s, color 0.1s;
}

.settings-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.settings-btn.active {
  background-color: var(--bg-active);
  color: var(--accent-color);
}

.mobile-connect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.1s, color 0.1s;
}

.mobile-connect-btn:hover {
  background-color: var(--bg-hover);
  color: var(--accent-color);
}

.quick-search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.1s, color 0.1s;
}

.quick-search-btn:hover {
  background-color: var(--bg-hover);
  color: var(--accent-color);
}

.user-avatar-wrap {
  position: relative;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.user-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
}

.user-status {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 7px;
  height: 7px;
  background: var(--online-color);
  border-radius: 50%;
  border: 1.5px solid var(--bg-secondary);
}

.user-name {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}


</style>
