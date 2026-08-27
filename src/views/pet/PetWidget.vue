<template>
  <div class="pet-widget">
    <div class="pet-bubble" v-show="status.state !== 'idle'">
      <span class="pet-bubble-text">{{ status.text }}</span>
    </div>
    <div class="pet-stage electron-drag-region">
      <img
        :src="avatarSrc"
        :class="['pet-avatar', `is-${status.state}`, walkDir === -1 ? 'flip' : '']"
        alt="pet"
        draggable="false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { electronService } from '@/services/electron';

const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}images/icon.png`;

const status = ref({ state: 'idle', text: '空闲中' });
const customAvatar = ref(null);
const walkDir = ref(1);

const avatarSrc = computed(() => customAvatar.value || DEFAULT_AVATAR);

const applyAvatarFromConfig = async () => {
  try {
    const config = await electronService.invoke('get-config');
    customAvatar.value = config?.pet?.avatar || config?.assistantProfile?.avatar || null;
  } catch (_e) {}
};

let unsubStatus = null;
let unsubAvatar = null;
let unsubConfig = null;
let unsubWalk = null;

onMounted(async () => {
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  // 主动拉一次当前状态，避免错过窗口创建初期的推送
  try {
    const state = await electronService.invoke('pet-get-state');
    if (state) {
      status.value = { state: state.state || 'idle', text: state.text || '空闲中' };
      customAvatar.value = state.avatar || null;
    }
  } catch (_e) {}
  await applyAvatarFromConfig();
  unsubStatus = electronService.listen('pet-status-changed', ({ payload }) => {
    status.value = { state: payload?.state || 'idle', text: payload?.text || '空闲中' };
  });
  unsubAvatar = electronService.listen('pet-avatar-changed', ({ payload }) => {
    customAvatar.value = payload?.avatar || null;
  });
  unsubConfig = electronService.listen('config-changed', applyAvatarFromConfig);
  unsubWalk = electronService.listen('pet-walk-changed', ({ payload }) => {
    walkDir.value = payload?.dir === -1 ? -1 : 1;
  });
});

onUnmounted(() => {
  unsubStatus?.();
  unsubAvatar?.();
  unsubConfig?.();
  unsubWalk?.();
});
</script>

<style scoped>
.pet-widget {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.pet-bubble {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 180px;
  padding: 6px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: var(--shadow-md);
  white-space: nowrap;
  animation: pet-bubble-in 0.18s ease-out;
}

.pet-bubble-text {
  font-size: 12px;
  color: var(--text-primary);
}

@keyframes pet-bubble-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.pet-stage {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 104px;
  height: 104px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  cursor: move;
}

.pet-avatar {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  box-shadow: var(--shadow-md);
  background: var(--bg-primary);
  pointer-events: none;
}

/* 待机：轻轻浮动 */
.pet-avatar.is-idle {
  animation: pet-bob 3s ease-in-out infinite;
}

/* 思考：小幅摇摆 */
.pet-avatar.is-thinking {
  animation: pet-wiggle 0.9s ease-in-out infinite;
}

/* 输出：欢快蹦跳 */
.pet-avatar.is-streaming {
  animation: pet-hop 0.55s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
}

/* 走路时朝向 */
.pet-avatar.flip {
  transform: scaleX(-1);
}

.pet-avatar.is-idle.flip {
  animation: pet-bob-flip 3s ease-in-out infinite;
}

.pet-avatar.is-streaming.flip {
  animation: pet-hop-flip 0.55s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
}

@keyframes pet-bob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-6px) rotate(-2deg); }
}

@keyframes pet-bob-flip {
  0%, 100% { transform: scaleX(-1) translateY(0) rotate(0deg); }
  50% { transform: scaleX(-1) translateY(-6px) rotate(2deg); }
}

@keyframes pet-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg) translateY(-2px); }
  75% { transform: rotate(5deg) translateY(-2px); }
}

@keyframes pet-hop {
  0%, 100% { transform: translateY(0) scaleY(1); }
  30% { transform: translateY(-14px) scaleY(1.04); }
  55% { transform: translateY(0) scaleY(0.96); }
  75% { transform: translateY(-4px); }
}

@keyframes pet-hop-flip {
  0%, 100% { transform: scaleX(-1) translateY(0) scaleY(1); }
  30% { transform: scaleX(-1) translateY(-14px) scaleY(1.04); }
  55% { transform: scaleX(-1) translateY(0) scaleY(0.96); }
  75% { transform: scaleX(-1) translateY(-4px); }
}
</style>
