/**
 * 无界面（headless）Friday 智能体运行器
 * ======================================
 * 复用项目的 createAgentWithContext，以非 IPC、无 BrowserWindow 的方式运行 Agent，
 * 把一段对话（messages）交给 Friday 处理并返回最终文本回复。
 *
 * 设计要点：
 *   - 每次调用使用全新的 thread_id，将完整历史（由调用方维护）一次性注入 input，
 *     避免依赖 checkpointer 跨轮记忆导致的重复。
 *   - unattended=true 时跳过工具审批中断（HITL），适合机器人场景，但需知悉危险性工具会
 *     被自动执行（见 config.bridge.unattended）。
 *   - 通过 onToken / onReasoning 回调流式吐字，供上层（OpenAI SSE）转发。
 *
 * 依赖 Electron 运行时（本项目在 Electron 主进程内启动桥接服务），
 * 因为部分 Agent 工具（浏览器工具）仍会 import 'electron'。
 */

import { randomUUID } from 'crypto'
import { createAgentWithContext } from '../agent/index.js'
import { loadConfig, getDataDir } from '../config.js'
import { createLogger } from '../agent/logger.js'

const log = createLogger('BridgeAgent')

/**
 * 解析要使用的模型配置
 * 优先用 body.model 匹配 customModels 的 id / modelName，
 * 否则回退到 selectedModelId，再回退到第一个可用模型。
 * @param {string} [model]
 * @returns {Object} 项目模型配置对象
 */
function resolveModelConfig(model) {
  const config = loadConfig()
  const models = Array.isArray(config.customModels) ? config.customModels : []
  let chosen = null
  if (model) {
    chosen = models.find((m) => m.id === model || m.modelName === model)
  }
  if (!chosen) {
    chosen = models.find((m) => m.id === config.selectedModelId) || models[0] || null
  }
  if (!chosen || !chosen.apiKey || !chosen.modelName || !chosen.baseUrl) {
    throw new Error('未配置可用的大模型，请在「设置 → 模型配置」中添加并选择默认模型')
  }
  return chosen
}

/**
 * 将 OpenAI 风格的 content（string | parts[]）归一成纯文本
 */
function extractText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === 'string' ? c : c?.text || c?.content || ''))
      .join('')
  }
  return ''
}

/**
 * 运行 Friday 智能体（headless）
 *
 * @param {Object} params
 * @param {Array} params.messages 对话历史 [{ role: 'user'|'assistant'|'system', content }]
 * @param {string} [params.model] 指定模型（id 或 modelName）
 * @param {boolean} [params.unattended] 是否无人值守（跳过审批）
 * @param {(text: string) => void} [params.onToken] 正文流式回调
 * @param {(text: string) => void} [params.onReasoning] 思考内容流式回调
 * @returns {Promise<{ content: string, reasoning: string }>}
 */
export async function runAgent({ messages, model, unattended = true, onToken, onReasoning } = {}) {
  const modelConfig = resolveModelConfig(model)
  log.info(`runAgent 启动: model=${modelConfig.modelName}, unattended=${unattended}, history=${messages?.length || 0}`)

  const { agent } = await createAgentWithContext(modelConfig, {
    mainWindow: null,
    dataDir: getDataDir(),
    folderPath: '',
    unattended,
    emit: () => {}
  })

  // Agent 自带 systemPrompt，故丢弃调用方传入的 system 角色，避免重复系统提示
  const inputMessages = (messages || [])
    .filter((m) => m && m.role && m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: extractText(m.content)
    }))

  const threadId = 'bridge-' + randomUUID()
  const config = { configurable: { thread_id: threadId } }

  let fullContent = ''
  let fullReasoning = ''

  const stream = await agent.streamEvents(
    { messages: inputMessages },
    { version: 'v2', ...config }
  )

  for await (const event of stream) {
    const { event: eventType, data } = event
    if (eventType !== 'on_chat_model_stream') continue
    const chunk = data?.chunk
    if (!chunk) continue

    const content =
      typeof chunk.content === 'string'
        ? chunk.content
        : Array.isArray(chunk.content)
          ? chunk.content.map((c) => (typeof c === 'string' ? c : c?.text || '')).join('')
          : ''
    if (content) {
      fullContent += content
      onToken && onToken(content)
    }

    const reasoning = chunk.additional_kwargs?.reasoning_content || chunk.additional_kwargs?.reasoning
    if (reasoning) {
      fullReasoning += reasoning
      onReasoning && onReasoning(reasoning)
    }
  }

  log.info(`runAgent 完成: contentLen=${fullContent.length}`)
  return { content: fullContent, reasoning: fullReasoning }
}
