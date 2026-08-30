export const DEFAULT_SYSTEM_PROMPT = '你是 斐思（Phronesis），一个定制化个人知识智能服务助手。你友好、专业，善于帮助用户解答问题和完成任务。'

export function defaultConfig() {
  return {
    language: 'zh-CN',
    theme: 'light',
    // 主进程运行日志：默认开启，兼容已有版本的行为
    runtimeLogsEnabled: true,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    noteFimCompletion: true,
    // 侧边栏可选功能模块：默认全部开启，兼容旧配置时缺失字段也视为开启
    sidebarModules: {
      schedule: true,
      automation: true
    },
    backup: {
      enabled: false,
      interval: 'daily',
      lastBackupAt: null,
      autoDir: null,
      maxKeep: 7
    },
    // 对话历史自动清理：默认关闭，开启后按阈值清理超过指定时间未活动的会话
    history: {
      autoClean: false,
      cleanBefore: '3months', // '1month' | '3months' | '6months' | '1year'
      lastCleanAt: null
    },
    rag: {},
    // Agent 单次任务最大执行步数；0 或缺省 = 不限制
    agent: {
      maxSteps: 0
    },
    // 桌面宠物：enabled 开关、avatar 覆盖形象（默认用助手头像）、position 记忆位置
    pet: {
      enabled: false,
      avatar: null,
      position: null
    },
    // 助手资料：留空时使用内置默认（名字/生日见 i18n，头像用应用图标）
    assistantProfile: {
      name: '',
      avatar: null,
      birthDate: ''
    },
    python: {
      path: null
    },
    // 系统级工具开关：控制是否允许 Agent 调用 WSL/wmic/sc/reg/schtasks 等系统工具
    systemTools: {
      wsl: false,
      wmic: false,
      sc: false,
      reg: false,
      schtasks: false
    },
    // 内置运行时开关：控制是否允许 Agent 使用随包提供的 Node.js/Python/Git Bash
    builtinRuntime: {
      python: true,
      nodejs: true,
      gitBash: true
    },
    // DeepSeek Harness 工作区目录：null = 使用默认位置（数据目录/deepseek-harness/workspace）
    harnessWorkspace: null,
    // 消息桥接服务：把 Friday 智能体暴露为 OpenAI 兼容的 /v1/chat/completions 端点，
    // 供外部平台接入：QQ（LangBot）、微信 ClawBot（OpenClaw 网关的模型后端）等。
    bridge: {
      enabled: false, // 是否启动桥接服务（亦可用环境变量 FRIDAY_BRIDGE=1 强制开启）
      host: '127.0.0.1',
      port: 18790,
      apiKey: '', // 非空时要求请求携带 Authorization: Bearer <apiKey>
      unattended: true, // 无人值守模式：跳过工具审批中断（true 时危险性工具会自动执行，请谨慎）
      allowedOrigins: '*', // CORS 允许的来源，'*' 或逗号分隔的 origin 列表
      maxHistory: 40 // 每个会话在服务端保留的最大消息条数（滑动窗口）
    }
  }
}
