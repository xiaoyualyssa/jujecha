import { Router } from 'express'
import { analyze } from '../ai/analyze.mjs'

const router = Router()

/**
 * POST /api/analyze
 * 请求体：{ text: string, mood: string, intensity: number }
 * 说明：仅接收脱敏后的文本内容，不接收任何身份信息。
 * 数据不上传云端存储，仅作为一次性的 AI 推理输入。
 */
router.post('/analyze', async (req, res) => {
  try {
    const { text, mood } = req.body || {}
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '缺少文本内容' })
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: '文本过长，请精简后重试' })
    }

    const result = await analyze(text, mood)
    res.json(result)
  } catch (e) {
    console.error('[analyze] 出错', e)
    res.status(500).json({ error: '分析服务暂时不可用，请稍后再试' })
  }
})

/** 健康检查 */
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: '看见自己·每日觉察手账',
    time: Date.now(),
    db: process.env.DATABASE_URL ? 'pg(configured)' : 'sqlite(fallback)',
  })
})

export default router
