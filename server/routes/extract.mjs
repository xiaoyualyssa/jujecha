import { Router } from 'express'
import { extractFields } from '../ai/extract.mjs'

const router = Router()

/**
 * POST /api/extract
 * 请求体：{ text: string }
 * 说明：仅接收脱敏文本，用于 AI 字段抽取，不存储任何身份信息。
 */
router.post('/extract', async (req, res) => {
  try {
    const { text } = req.body || {}
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '缺少文本内容' })
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: '文本过长，请精简后重试' })
    }
    const result = await extractFields(text)
    res.json(result)
  } catch (e) {
    console.error('[extract] 出错', e)
    res.status(500).json({ error: '抽取服务暂时不可用，请稍后再试' })
  }
})

export default router
