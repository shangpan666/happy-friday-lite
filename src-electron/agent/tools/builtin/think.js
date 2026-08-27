/**
 * 内置工具：思考规划（think）
 * ============================================
 * 让 Agent 在执行复杂任务前先"写下"思考与分步计划，执行中随时回顾与修正。
 *
 * - 无副作用：仅把思考内容原样返回，不操作任何资源
 * - 前端会把 think 工具调用渲染为「思考过程」卡片（区别于普通工具调用）
 * - 思考内容会进入模型上下文，起到规划与自我提醒的作用
 */

import { z } from 'zod'
import { registerTool } from '../registry.js'

const schema = z.object({
  thought: z
    .string()
    .describe('当前的思考内容：任务理解、分步计划、已知信息、下一步行动、风险与备选方案等')
})

async function handler(args, ctx) {
  const { thought } = args
  ctx.logger.info(`[think] len=${String(thought).length}`)
  return '思考已记录。请按计划继续执行；如计划有变，可再次调用本工具修正。'
}

registerTool({
  name: 'think',
  description:
    '记录你的思考与任务规划。在处理复杂/多步任务时，先调用本工具写下：任务目标、分步计划、' +
    '当前进展与下一步行动；执行过程中遇到意外或计划调整时再次调用以修正思路。' +
    '本工具不产生任何副作用，仅用于规划与自我梳理。',
  schema,
  handler,
  meta: { requireApproval: false }
})
