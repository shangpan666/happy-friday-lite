<template>
  <div class="ask-card" :class="{ answered: status !== 'running' }">
    <div class="ask-head">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="ask-title">{{ status === 'running' ? '需要你确认几个问题' : '已回答' }}</span>
    </div>

    <div class="ask-list">
      <div v-for="(q, qi) in localQuestions" :key="qi" class="ask-item">
        <div class="ask-question">{{ qi + 1 }}. {{ q.question }}</div>
        <div v-if="status === 'running'" class="ask-options">
          <button
            v-for="opt in q.options"
            :key="opt"
            :class="['ask-option', { selected: answers[qi] === opt }]"
            @click="pick(qi, opt)"
          >{{ opt }}</button>
          <button
            :class="['ask-option', 'custom-toggle', { selected: customMode[qi] }]"
            @click="toggleCustom(qi)"
          >其他…</button>
        </div>
        <input
          v-if="status === 'running' && customMode[qi]"
          v-model="customInputs[qi]"
          class="ask-custom-input"
          placeholder="输入你的想法…"
          @keydown.enter.stop
        />
        <div v-if="status !== 'running'" class="ask-answer">{{ displayAnswer(qi) }}</div>
      </div>
    </div>

    <div v-if="status === 'running'" class="ask-actions">
      <button class="ask-submit" :disabled="!allAnswered || submitting" @click="submit">
        {{ submitting ? '提交中…' : '提交回答' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { electronService } from '@/services/electron'

const props = defineProps({
  requestId: { type: String, default: '' },
  toolCallId: { type: String, required: true },
  questions: { type: Array, default: () => [] },
  answers: { type: Array, default: null },
  status: { type: String, default: 'running' }
})

const emit = defineEmits(['submitted'])

const localQuestions = ref([])
const answers = ref({})
const customInputs = ref({})
const customMode = ref({})
const answersText = ref({})
const submitting = ref(false)

function displayAnswer(qi) {
  return answersText.value[qi] || props.answers?.[qi]?.answer || '—'
}

watch(
  () => props.questions,
  (qs) => {
    localQuestions.value = (qs || []).map((q) => ({
      question: q.question,
      options: Array.isArray(q.options) ? q.options : [],
      allowCustom: q.allowCustom !== false
    }))
  },
  { immediate: true, deep: true }
)

function pick(qi, opt) {
  answers.value[qi] = opt
  customMode.value[qi] = false
}

function toggleCustom(qi) {
  customMode.value[qi] = !customMode.value[qi]
  if (customMode.value[qi]) delete answers.value[qi]
}

const allAnswered = computed(() =>
  localQuestions.value.length > 0 &&
  localQuestions.value.every((q, qi) => {
    if (customMode.value[qi]) return (customInputs.value[qi] || '').trim().length > 0
    return !!answers.value[qi]
  })
)

async function submit() {
  if (submitting.value || !allAnswered.value) return
  submitting.value = true
  const result = localQuestions.value.map((q, qi) => ({
    question: q.question,
    answer: customMode.value[qi]
      ? (customInputs.value[qi] || '').trim()
      : answers.value[qi]
  }))
  try {
    await electronService.invoke('agent-ask-user-answer', {
      requestId: props.requestId,
      toolCallId: props.toolCallId,
      answers: result
    })
    answersText.value = Object.fromEntries(result.map((r, i) => [i, r.answer]))
    emit('submitted', result)
  } catch (e) {
    console.error('提交回答失败:', e)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* 无边框，融入消息块 */
.ask-card {
  background: transparent;
  border: none;
  padding: 2px 0;
}

.ask-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-color);
  margin-bottom: 8px;
}

.ask-title {
  font-size: 12.5px;
  font-weight: 600;
}

.ask-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ask-item {
  border-left: 2px solid var(--border-strong);
  padding-left: 12px;
  margin-left: 2px;
}

.ask-question {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.ask-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ask-option {
  padding: 5px 12px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.12s, background-color 0.12s, color 0.12s;
}

.ask-option:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.ask-option.selected {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: var(--accent-text-on);
}

.custom-toggle {
  border-style: dashed;
}

.ask-custom-input {
  margin-top: 6px;
  width: 100%;
  box-sizing: border-box;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
}

.ask-custom-input:focus {
  border-color: var(--accent-color);
}

.ask-answer {
  font-size: 12.5px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  display: inline-block;
}

.ask-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.ask-submit {
  height: 28px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent-color);
  color: var(--accent-text-on);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.12s;
}

.ask-submit:hover:not(:disabled) {
  background: var(--accent-hover);
}

.ask-submit:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
