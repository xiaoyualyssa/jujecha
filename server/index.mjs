import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import analyzeRouter from './routes/analyze.mjs'
import extractRouter from './routes/extract.mjs'
import authRouter from './routes/auth.mjs'
import journalRouter from './routes/journal.mjs'
import actionsRouter from './routes/actions.mjs'
import periodRouter from './routes/period.mjs'

const app = express()
const PORT = process.env.PORT || 8787
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: CLIENT_ORIGIN.split(',').map((s) => s.trim()) }))
app.use(express.json({ limit: '100kb' }))

// 简单请求日志
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  }
  next()
})

app.use('/api', analyzeRouter)
app.use('/api', extractRouter)
app.use('/api/auth', authRouter)
app.use('/api/journal', journalRouter)
app.use('/api/actions', actionsRouter)
app.use('/api', periodRouter)

// 静态站点（路演宣传页 /pitch.html 等），与 API 同源托管
const __dirname = dirname(fileURLToPath(import.meta.url))
app.use(express.static(join(__dirname, 'public')))

app.listen(PORT, () => {
  console.log(`🌿 看见自己 · 每日觉察手账 后端已启动`)
  console.log(`   监听: http://localhost:${PORT}`)
  console.log(`   认证: http://localhost:${PORT}/api/auth/*`)
  console.log(`   记录: http://localhost:${PORT}/api/journal`)
  console.log(`   行动: http://localhost:${PORT}/api/actions`)
  console.log(`   AI 分析: http://localhost:${PORT}/api/analyze`)
  console.log(`   AI 抽取: http://localhost:${PORT}/api/extract`)
  console.log(`   AI 周期复盘: http://localhost:${PORT}/api/analyze-period`)
  console.log(`   密钥状态: ${process.env.ALIYUN_AK_ID ? '阿里云NLP✓' : '阿里云NLP✗'} ${process.env.ALIYUN_DASHSCOPE_API_KEY ? '通义千问✓' : '通义千问✗'} ${process.env.BAIDU_API_KEY ? '百度✓' : '百度✗'}（未配置时使用本地隐私兜底）`)
})
