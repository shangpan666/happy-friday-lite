<template>
  <div class="assistant-profile">
    <div class="panel-header">
      <h2 class="section-title">{{ t('drawer.profile.title') }}</h2>
      <button class="close-btn" @click="emit('close')">
        <X :size="16" :stroke-width="2" />
      </button>
    </div>

    <div class="panel-body">
      <div class="profile-preview">
        <button class="avatar-edit-wrap" :title="t('drawer.profile.avatarHint')" @click="triggerPick">
          <img v-if="form.avatar" :src="form.avatar" class="profile-avatar" alt="avatar" />
          <img v-else :src="defaultAvatar" class="profile-avatar" alt="avatar" />
          <span class="avatar-edit-badge">
            <Pencil :size="11" :stroke-width="2" />
          </span>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/png, image/jpeg, image/webp, image/gif"
          class="hidden-input"
          @change="onFilePicked"
        />
        <div class="profile-meta">
          <div class="meta-row">
            <span class="meta-label">{{ t('drawer.profile.name') }}</span>
            <span class="meta-value">{{ form.name || defaultName }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">{{ t('drawer.profile.birthDate') }}</span>
            <span class="meta-value">{{ formatBirthDate(form.birthDate) || defaultBirthDate }}</span>
          </div>
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">{{ t('drawer.profile.name') }}</label>
        <input
          v-model="form.name"
          type="text"
          class="form-input"
          :placeholder="defaultName"
          maxlength="24"
        />
      </div>

      <div class="form-section">
        <label class="form-label">{{ t('drawer.profile.birthDate') }}</label>
        <input v-model="form.birthDate" type="date" class="form-input" />
      </div>

      <div class="form-actions">
        <button class="btn ghost" :disabled="saving" @click="resetProfile">
          {{ t('drawer.profile.reset') }}
        </button>
        <button class="btn primary" :disabled="saving" @click="saveProfile">
          {{ saving ? '…' : t('drawer.profile.save') }}
        </button>
      </div>
    </div>

    <Transition name="menu-fade">
      <div v-if="notice" class="notice" :class="notice.type">{{ notice.text }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { X, Pencil } from 'lucide-vue-next';

const { t } = useI18n();

const emit = defineEmits(['close']);

const LS_KEY = 'phronesis-assistant-profile';
const defaultAvatar = `${import.meta.env.BASE_URL}images/icon.png`;
const defaultName = t('drawer.memory.fridayName');
const defaultBirthDate = '2026-02-07';

const readLocalProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  } catch (_e) {
    return null;
  }
};

// 先用 localStorage 同步初始化，避免打开时闪回默认值
const form = ref(readLocalProfile() || {
  name: '',
  avatar: null,
  birthDate: ''
});

const saving = ref(false);
const notice = ref(null);
let noticeTimer = null;

const fileInputRef = ref(null);

const showNotice = (text, type = 'info') => {
  notice.value = { text, type };
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.value = null;
  }, 2800);
};

const loadProfile = async () => {
  let profile = null;
  try {
    const config = await window.electronAPI?.invoke('get-config');
    if (config?.assistantProfile) profile = config.assistantProfile;
  } catch (_e) {}
  if (!profile) {
    try {
      profile = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    } catch (_e) {}
  }
  if (profile) {
    form.value = {
      name: profile.name || '',
      avatar: profile.avatar || null,
      birthDate: profile.birthDate || ''
    };
  }
};

const persistLocal = () => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(form.value));
  } catch (_e) {}
};

const saveProfile = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    persistLocal();
    const config = (await window.electronAPI?.invoke('get-config')) || {};
    config.assistantProfile = { ...form.value };
    const res = await window.electronAPI?.invoke('save-config', config);
    if (res && res.success === false) {
      showNotice(t('drawer.profile.saveFailed'), 'error');
    } else {
      window.dispatchEvent(new CustomEvent('assistant-profile-changed'));
      showNotice(t('drawer.profile.saved'), 'info');
    }
  } catch (_e) {
    window.dispatchEvent(new CustomEvent('assistant-profile-changed'));
    showNotice(t('drawer.profile.saved'), 'info');
  } finally {
    saving.value = false;
  }
};

const resetProfile = () => {
  form.value = { name: '', avatar: null, birthDate: '' };
  persistLocal();
  saveProfile();
  showNotice(t('drawer.profile.resetDone'), 'info');
};

const triggerPick = () => {
  fileInputRef.value?.click();
};

const onFilePicked = (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      form.value.avatar = canvas.toDataURL('image/png');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
};

const formatBirthDate = (value) => {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  const [y, m, d] = parts;
  return `${y}.${Number(m)}.${Number(d)}`;
};

onMounted(loadProfile);
</script>

<style scoped>
.assistant-profile {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
  flex-shrink: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  transition: background-color 0.12s, color 0.12s;
}

.close-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
}

.avatar-edit-wrap {
  position: relative;
  width: 56px;
  height: 56px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 50%;
  flex-shrink: 0;
}

.profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.avatar-edit-badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-secondary);
  box-sizing: content-box;
}

.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.meta-row {
  display: flex;
  gap: 10px;
  font-size: 13px;
}

.meta-label {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.meta-value {
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.12s;
}

.form-input:focus {
  border-color: var(--accent-color);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn {
  height: 30px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.12s, border-color 0.12s;
}

.btn.primary {
  background: var(--accent-color);
  color: var(--accent-text-on);
  border: none;
}

.btn.primary:hover {
  background: var(--accent-hover);
}

.btn.ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border-color);
}

.btn.ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.hidden-input {
  display: none;
}

.notice {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: var(--radius-md);
  font-size: 12.5px;
  white-space: nowrap;
  box-shadow: var(--shadow-md);
  z-index: 5;
}

.notice.info {
  background: var(--text-primary);
  color: var(--bg-primary);
}

.notice.error {
  background: var(--danger-color);
  color: #fff;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.15s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
}
</style>
