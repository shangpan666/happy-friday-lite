/**
 * 内置工具：选项提问（ask_user）
 * ============================================
 * 当关键需求不明确时，向用户提出带选项的问题，用户点选即可回答，减少来回沟通。
 *
 * 流程：
 *   LLM 调用 ask_user → 工具挂起等待 → IPC 推送 agent-ask-user 事件
 *   → 前端渲染选项卡片 → 用户点选提交 → agent-ask-user-answer 回传
 *   → 工具返回格式化的答案文本 → LLM 继续执行
 */

import { z } from 'zod'
import { registerTool } from '../registry.js'
import { waitForUserAnswer } from '../../humanInTheLoop.js'

const schema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().describe('要问用户的问题，应具体、可直接回答'),
        options: z
          .array(z.string())
          .min(2)
          .max(6)
          .describe('供用户点选的选项（2-6 个），选项应覆盖最常见的回答'),
        allowCustom: z.boolean().optional().describe('是否允许用户自定义输入，默认允许')
      })
    )
    .min(1)
    .max(6)
    .describe('一次提出的问题列表（1-6 个），相关的问题尽量合并为一次调用')
})

async function handler(args, ctx, callMeta) {
  const { questions } = args
  const toolCallId = callMeta?.toolCallId || `ask_${Date.now()}`
  ctx.logger.info(`[ask_user] ${questions.length} 个问题`)

  // 无界面 / 无人值守模式（消息桥接、headless）：没有 UI 可供点选，
  // 等待用户答案会永久挂起，改为提示 LLM 自行以合理默认继续。
  if (!ctx.mainWindow || ctx.unattended) {
    const summary = questions
      .map((q, i) => `${i + 1}. ${q.question}（可选：${(q.options || []).join(' / ')}）`)
      .join('\n')
    ctx.logger.info(`[ask_user] headless 模式，跳过等待，返回默认提示`)
    return (
      '（当前为无界面/自动模式，无法弹出选项卡片，已跳过提问。）\n' +
      `未回答的问题：\n${summary}\n` +
      '请基于你最合理的默认判断继续执行任务；若确实必需，可在最终回复中直接向用户文字询问。'
    )
  }

  ctx.emit('agent-ask-user', {
    requestId: ctx.requestId,
    toolCallId,
    questions
  })

  const answers = await waitForUserAnswer(ctx.requestId, toolCallId)

  if (!answers || answers.length === 0) {
    return '用户未回答（超时或已取消）。请基于已有信息继续执行，或稍后用不同方式再次询问。'
  }

  const lines = answers.map((a, i) => `${i + 1}. ${a.question}\n答：${a.answer}`)
  return `用户的回答如下：\n${lines.join('\n')}`
}

registerTool({
  name: 'ask_user',
  description:
    '向用户提出带选项的问题，用户点选即可回答。当任务的关键需求不明确（如类型、功能范围、技术偏好、风格等）' +
    '且缺少这些信息会显著影响结果时使用。一次可问多个相关问题；选项应覆盖常见回答，并始终提供"其他/自定义"可能。' +
    '不要用于本可自行判断的细节，避免滥用。',
  schema,
  handler,
  meta: { requireApproval: false }
})
