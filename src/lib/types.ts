// ===== 核心类型定义 =====

/** 情绪标签（预设 + 可自定义） */
export type MoodKey =
  | '平静' | '开心' | '低落' | '焦虑' | '疲惫' | '烦躁'
  | '委屈' | '愤怒' | '孤独' | '心寒' | '温暖' | '满足' | '期待'

/** 身体感受标签（预设 + 可自定义） */
export type BodyKey =
  | '喉咙紧' | '胸口闷' | '胃沉' | '肩硬' | '手冷' | '头痛'
  | '失眠' | '乏力' | '呼吸短促' | '紧绷' | '放松' | '精力充沛'

/** 情绪/身体打分条目：预设标签或自定义文本 + 1-10 强度 */
export interface FeelingScore {
  /** 预设标签（若为自定义则为空字符串） */
  label: string
  /** 自定义文本（预设时为空） */
  custom?: string
  /** 强度 1-10 */
  score: number
  /** 展示名 */
  display: string
}

/** 行动：区分「冲动反应」与「理性选择」 */
export type ActionKind = 'impulse' | 'rational'

export interface MyAction {
  kind: ActionKind
  text: string
}

/** 每日结构化记录（一天可多条，每条按 id 唯一） */
export interface JournalEntry {
  id: string
  /** 记录日期 YYYY-MM-DD，同一天可有多条记录 */
  date: string
  /** 记录时间戳 */
  timestamp: number
  /** 1. 发生了什么（客观事件，不加评判） */
  event: string
  /** 2. 我的身体感受（多选 + 自定义 + 打分） */
  bodyFeelings: FeelingScore[]
  /** 3. 我的情绪（多选 + 自定义 + 打分） */
  emotions: FeelingScore[]
  /** 4. 我当时怎么想的（自动思维） */
  thoughts: string
  /** 5. 我做了什么/打算做什么（区分冲动与理性） */
  actions: MyAction[]
  /** 6. ✨微小感动（独立区域，留空需温和提醒） */
  tinyJoy: string
  /** 7. 今日自我关怀（鼓励微小行动） */
  selfCare: string
  /** 8. 今天我对自己满意度 1-5（用于成长曲线） */
  satisfaction: number
  createdAt: number
  updatedAt: number
  /** 内部标记：该记录 id 已对应云端记录（避免重复新建） */
  cloudSynced?: boolean
}

/** 行动计划优先级 */
export type Priority = 'high' | 'medium' | 'low'

export interface ActionItem {
  id: string
  title: string
  reason: string
  /** 截止日期 YYYY-MM-DD，可为空 */
  dueDate: string | null
  /** 优先级 */
  priority: Priority
  /** done | doing | todo */
  status: 'todo' | 'doing' | 'done'
  /** 关联的觉察记录 id（问题→行动→解决 闭环） */
  linkedEntryId: string | null
  createdAt: number
}

/** AI 情绪分析结果 */
export interface AnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  confidence: number
  keywords: string[]
  summary: string
  suggestion: string
  source: 'remote' | 'local'
  analyzedAt: number
}

export interface AnalyzePayload {
  text: string
  mood: string
  intensity: number
}

// ---------- 常量 ----------

/** 预设情绪选项 */
export const MOOD_OPTIONS: string[] = [
  '平静', '开心', '低落', '焦虑', '疲惫', '烦躁',
  '委屈', '愤怒', '孤独', '心寒', '温暖', '满足', '期待',
  '难过', '害怕', '担心', '自责', '纠结', '内耗', '紧张', '压力',
  '无力', '崩溃', '麻木', '无聊', '困惑', '感动', '感激', '惊喜', '兴奋', '放松',
]

/** 预设身体感受选项 */
export const BODY_OPTIONS: string[] = [
  '喉咙紧', '胸口闷', '胃沉', '肩硬', '手冷', '头痛',
  '失眠', '乏力', '呼吸短促', '紧绷', '放松', '精力充沛',
]

/** 情绪配色 */
export const MOOD_COLORS: Record<string, string> = {
  '平静': '#5A7D7C',
  '开心': '#E8B4A0',
  '低落': '#8FA6B3',
  '焦虑': '#D9A6AD',
  '疲惫': '#B4A79B',
  '烦躁': '#C98A8A',
  '委屈': '#A9B8C9',
  '愤怒': '#C46A6A',
  '孤独': '#9AA8B8',
  '心寒': '#8FA6B3',
  '温暖': '#E7C6A5',
  '满足': '#9CBFA8',
  '期待': '#E7C6A5',
  '难过': '#8FA6B3',
  '害怕': '#A9B8C9',
  '担心': '#9AA8B8',
  '自责': '#C98A8A',
  '纠结': '#B4A79B',
  '内耗': '#D9A6AD',
  '紧张': '#D9A6AD',
  '压力': '#B4A79B',
  '无力': '#9AA8B8',
  '崩溃': '#C46A6A',
  '麻木': '#8FA6B3',
  '无聊': '#B4A79B',
  '困惑': '#A9B8C9',
  '感动': '#E7C6A5',
  '感激': '#E7C6A5',
  '惊喜': '#E8B4A0',
  '兴奋': '#E8B4A0',
  '放松': '#9CBFA8',
}

/** 情绪 emoji */
export const MOOD_EMOJI: Record<string, string> = {
  '平静': '😌', '开心': '😊', '低落': '😞', '焦虑': '😰', '疲惫': '😪',
  '烦躁': '😤', '委屈': '🥺', '愤怒': '😠', '孤独': '🌙', '心寒': '💧',
  '温暖': '🌞', '满足': '😇', '期待': '🤩',
  '难过': '😢', '害怕': '😨', '担心': '😟', '自责': '😔', '纠结': '🤔',
  '内耗': '🌀', '紧张': '😬', '压力': '😫', '无力': '😞', '崩溃': '💔',
  '麻木': '😐', '无聊': '🥱', '困惑': '😕', '感动': '🥲', '感激': '🙏',
  '惊喜': '😲', '兴奋': '🎉', '放松': '🧘',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#C46A6A',
  medium: '#E7C6A5',
  low: '#9CBFA8',
}

/** 预设鼓励语（仪表盘随机显示） */
export const ENCOURAGE_QUOTES: string[] = [
  '你的感受是真实的，值得被认真对待。',
  '慢慢来，你已经在照顾自己了。',
  '不是「想太多」，是你在认真地感受这个世界。',
  '允许自己慢一点，也是一种力量。',
  '今天也辛苦了，抱抱自己。',
  '情绪没有对错，它只是来提醒你点什么。',
  '你已经比昨天更了解自己一点点。',
  '不必急着变好，先好好存在。',
]
