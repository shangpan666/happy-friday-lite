/**
 * 人机交互（HITL）处理
 * =====================
 * 设计参考：Agent智能体设计.md 2.8
 *
 * 流程：
 *   LLM 调用危险工具 → DeepAgent interrupt 暂停 → IPC 推送审批事件
 *   → 渲染进程弹窗 → 用户 approve/reject/edit → IPC 回传决策
 *   → 构造 Command({ resume }) → Agent 恢复执行
 *
 * 危险命令识别（针对 execute_command 工具，在 shellExec.js 中实现白名单/黑名单）：
 *   - 白名单：ls/cat/pwd/echo/grep/find/wc/head/tail 等只读命令
 *   - 黑名单：rm -rf /、mkfs、dd if=、shutdown 等
 *   - 不在白名单的命令默认触发审批
 */

import { Command } from '@langchain/langgraph'
import { AGENT_TOOL_APPROVAL, AGENT_TOOL_RESULT } from '../events.js'
import { createLogger } from './logger.js'

const log = createLogger('HITL')

// 等待审批的 Promise 映射：requestId → { resolve, reject }
const pendingApprovals = new Map()

/**
 * 注册一个等待审批的 Promise
 * 当 IPC 收到 agent-tool-approval-resume 时，调用 resolveApprove/resolveReject
 * @param {string} requestId
 * @returns {Promise<{ type: 'approve' } | { type: 'reject', reason?: string }>}
 */
export function waitForApproval(requestId) {
  return new Promise((resolve, reject) => {
    pendingApprovals.set(requestId, { resolve, reject })
    log.info(`等待用户审批: requestId=${requestId}`)
  })
}

/**
 * 处理用户的审批决策（approve）
 * 由 ipc.js 在收到 agent-tool-approval-resume 时调用
 * @param {string} requestId
 */
export function resolveApprove(requestId) {
  const pending = pendingApprovals.get(requestId)
  if (pending) {
    pending.resolve({ type: 'approve' })
    pendingApprovals.delete(requestId)
    log.info(`用户已批准: requestId=${requestId}`)
  } else {
    log.warn(`未找到等待中的审批（approve）: requestId=${requestId}`)
  }
}

/**
 * 处理用户的拒绝决策（reject）
 * @param {string} requestId
 * @param {string} [reason]
 */
export function resolveReject(requestId, reason = '用户拒绝执行') {
  const pending = pendingApprovals.get(requestId)
  if (pending) {
    pending.resolve({ type: 'reject', reason })
    pendingApprovals.delete(requestId)
    log.info(`用户已拒绝: requestId=${requestId}, reason=${reason}`)
  } else {
    log.warn(`未找到等待中的审批（reject）: requestId=${requestId}`)
  }
}

/**
 * 取消等待中的审批（用于 agent-stop 或异常情况）
 * @param {string} requestId
 */
export function cancelApproval(requestId) {
  const pending = pendingApprovals.get(requestId)
  if (pending) {
    pending.reject(new Error('审批已被取消'))
    pendingApprovals.delete(requestId)
    log.info(`已取消审批: requestId=${requestId}`)
  }
}

// ========== 选项提问（ask_user）等待 ==========
// ask_user 工具挂起等待用户点选选项，答案通过 IPC 回传后 resolve。
const pendingAnswers = new Map()

/**
 * 等待用户回答选项问题
 * @param {string} requestId
 * @param {string} toolCallId
 * @returns {Promise<Array<{question, answer}>|null>} 超时/取消返回 null
 */
export function waitForUserAnswer(requestId, toolCallId) {
  const key = `${requestId}:${toolCallId}`
  return new Promise((resolve) => {
    const entry = {
      requestId,
      resolveFn: resolve,
      timer: setTimeout(() => {
        if (pendingAnswers.delete(key)) {
          log.warn(`选项提问超时未回答: ${key}`)
          resolve(null)
        }
      }, 600000)
    }
    pendingAnswers.set(key, entry)
    log.info(`等待用户回答选项: ${key}`)
  })
}

/**
 * 用户已提交答案
 */
export function resolveUserAnswer(requestId, toolCallId, answers) {
  const key = `${requestId}:${toolCallId}`
  const entry = pendingAnswers.get(key)
  if (entry) {
    clearTimeout(entry.timer)
    pendingAnswers.delete(key)
    entry.timer?.unref?.()
    log.info(`用户已回答选项: ${key}`)
    resolveAnswer(entry, answers)
  } else {
    log.warn(`未找到等待中的选项提问: ${key}`)
  }
}

function resolveAnswer(entry, answers) {
  // 通过闭包外的 resolve 调用：entry 中保存 resolve
  if (entry.resolveFn) entry.resolveFn(answers)
}

/**
 * 取消该请求下所有等待中的提问（agent-stop 时调用）
 */
export function cancelUserAnswer(requestId) {
  for (const [key, entry] of [...pendingAnswers.entries()]) {
    if (entry.requestId === requestId) {
      clearTimeout(entry.timer)
      pendingAnswers.delete(key)
      if (entry.resolveFn) entry.resolveFn(null)
      log.info(`已取消选项提问: ${key}`)
    }
  }
}

/**
 * 构造恢复执行的 Command
 * @param {{ type: 'approve' } | { type: 'reject', reason?: string }} decision
 * @returns {Command}
 */
export function buildResumeCommand(decision) {
  // DeepAgent SDK 的 HITL 恢复格式：Command({ resume: { decisions: [...] } })
  if (decision.type === 'approve') {
    return new Command({
      resume: { decisions: [{ type: 'approve' }] }
    })
  } else {
    return new Command({
      resume: { decisions: [{ type: 'reject', reason: decision.reason || '用户拒绝' }] }
    })
  }
}

/**
 * 推送工具调用开始事件到前端
 * @param {Object} mainWindow Electron 主窗口
 * @param {Object} payload { requestId, toolCallId, toolName, arguments, requireApproval }
 */
export function emitToolCall(mainWindow, payload) {
  mainWindow?.webContents?.send(AGENT_TOOL_CALL, payload)
  log.debug(`推送工具调用事件: ${payload.toolName} (requireApproval=${!!payload.requireApproval})`)
}

/**
 * 推送工具调用结果事件到前端
 * @param {Object} mainWindow
 * @param {Object} payload { requestId, toolCallId, toolName, output, status }
 */
export function emitToolResult(mainWindow, payload) {
  mainWindow?.webContents?.send(AGENT_TOOL_RESULT, payload)
  log.debug(`推送工具结果事件: ${payload.toolName} status=${payload.status}`)
}

/**
 * 推送审批请求事件到前端
 * @param {Object} mainWindow
 * @param {Object} payload { requestId, toolCallId, toolName, arguments, description }
 */
export function emitApprovalRequest(mainWindow, payload) {
  mainWindow?.webContents?.send(AGENT_TOOL_APPROVAL, payload)
  log.info(`请求审批: ${payload.toolName} (requestId=${payload.requestId})`)
}

/**
 * 检查是否有等待中的审批
 * @param {string} requestId
 * @returns {boolean}
 */
export function hasPendingApproval(requestId) {
  return pendingApprovals.has(requestId)
}
