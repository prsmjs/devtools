import express from 'express'
import cors from 'cors'
import Queue from '@prsm/queue'
import { Cron } from '@prsm/cron'
import { slidingWindow, tokenBucket } from '@prsm/limit'
import { createGraph } from '@prsm/cells'
import { prsmDevtools } from '../src/index.js'

const app = express()
app.use(cors())

const queue = new Queue({
  concurrency: 3,
  maxRetries: 2,
  timeout: '10s',
  groups: { concurrency: 1 },
})

queue.process(async (payload) => {
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000))
  if (Math.random() < 0.1) throw new Error('random failure')
  return { processed: true }
})

const cron = new Cron()

cron.add('heartbeat', '5s', async () => {
  return { ts: Date.now() }
})

cron.add('cleanup', '*/1 * * * *', async () => {
  return { cleaned: Math.floor(Math.random() * 10) }
})

const apiLimiter = slidingWindow({ max: 100, window: '1m' })
const uploadLimiter = tokenBucket({ capacity: 10, refillRate: 2, refillInterval: '1s' })

const g = createGraph({ prefix: 'portfolio:' })

const btc = g.cell('btc-price', 67000, {
  history: true,
  source: { type: 'polled-api', endpoint: 'api.example.com/price/btc', interval: '5s' },
  metadata: { description: 'Latest BTC price in USD', units: 'usd' },
})

const eth = g.cell('eth-price', 3400, {
  history: true,
  source: { type: 'polled-api', endpoint: 'api.example.com/price/eth', interval: '5s' },
  metadata: { description: 'Latest ETH price in USD', units: 'usd' },
})

const holdings = g.cell('holdings', { btc: 0.25, eth: 4 }, {
  metadata: { description: 'User portfolio holdings' },
})

const portfolioValue = g.cell(
  'portfolio-value',
  () => {
    const h = holdings()
    return btc() * h.btc + eth() * h.eth
  },
  {
    history: true,
    metadata: { description: 'Total USD value of holdings' },
  }
)

const baseline = g.cell('baseline', 30000, {
  metadata: { description: 'Starting baseline for change calculations' },
})

const portfolioChange = g.cell(
  'portfolio-change-pct',
  () => {
    const base = baseline()
    return ((portfolioValue() - base) / base) * 100
  },
  { metadata: { description: 'Percent change from baseline' } }
)

const riskTier = g.cell('risk-tier', () => {
  const pct = portfolioChange()
  if (pct > 50) return 'high'
  if (pct > 10) return 'medium'
  if (pct > -10) return 'stable'
  return 'low'
})

g.template(
  'system-prompt',
  `You are analyzing a crypto portfolio.
Holdings: {{holdings}}
BTC: \${{btc-price}}, ETH: \${{eth-price}}
Total value: \${{portfolio-value}}
Change from baseline: {{portfolio-change-pct}}%
Risk tier: {{risk-tier}}
{{#if risk-tier}}Please respond with a brief market analysis.{{/if}}`,
  { metadata: { description: 'LLM prompt assembled from upstream cells' } }
)

setInterval(() => {
  btc(Math.round(67000 + (Math.random() - 0.5) * 4000))
  eth(Math.round(3400 + (Math.random() - 0.5) * 300))
}, 3000)

setInterval(() => {
  if (Math.random() < 0.3) {
    const cur = holdings()
    g.set('holdings', { btc: +(cur.btc + (Math.random() - 0.5) * 0.05).toFixed(3), eth: +(cur.eth + (Math.random() - 0.5) * 0.4).toFixed(2) })
  }
}, 7000)

const health = createGraph({ prefix: 'health:' })

health.cell('cpu', 12, { history: true, source: { type: 'metric', interval: '4s' }, metadata: { description: 'CPU usage %' } })
health.cell('memory', 48, { history: true, source: { type: 'metric', interval: '4s' }, metadata: { description: 'Memory usage %' } })
health.cell('queue-depth', 0, { history: true, source: { type: 'metric', interval: '4s' } })

health.cell('load-score', () => {
  return Math.round((health.value('cpu') + health.value('memory')) / 2)
}, { metadata: { description: 'Combined load score' } })

health.cell('status', () => {
  const s = health.value('load-score')
  if (s > 80) return 'critical'
  if (s > 60) return 'degraded'
  return 'healthy'
})

health.template(
  'incident-summary',
  `System status: {{status}} (load score: {{load-score}})
CPU: {{cpu}}%  Memory: {{memory}}%  Queue depth: {{queue-depth}}`,
  { metadata: { description: 'Summary for incident channels' } }
)

setInterval(() => {
  health.set('cpu', Math.max(1, Math.min(99, health.value('cpu') + Math.round((Math.random() - 0.5) * 20))))
  health.set('memory', Math.max(1, Math.min(99, health.value('memory') + Math.round((Math.random() - 0.5) * 10))))
  health.set('queue-depth', Math.max(0, health.value('queue-depth') + Math.round((Math.random() - 0.4) * 50)))
}, 4000)

app.use(
  '/devtools',
  prsmDevtools({
    queue,
    cron,
    limit: { api: apiLimiter, uploads: uploadLimiter },
    cells: { portfolio: g, health },
  }),
)

app.post('/test/enqueue', async (req, res) => {
  const id = await queue.push({ name: 'test-job', ts: Date.now() })
  res.json({ id })
})

app.post('/test/enqueue-group', async (req, res) => {
  const groups = ['tenant-a', 'tenant-b', 'tenant-c']
  const group = groups[Math.floor(Math.random() * groups.length)]
  const id = await queue.group(group).push({ name: 'grouped-job', group, ts: Date.now() })
  res.json({ id, group })
})

app.post('/test/flood', async (_req, res) => {
  const promises = []
  for (let i = 0; i < 10; i++) promises.push(queue.push({ name: `flood-${i}` }))
  for (let i = 0; i < 5; i++) {
    const group = ['tenant-a', 'tenant-b'][i % 2]
    promises.push(queue.group(group).push({ name: `group-flood-${i}`, group }))
  }
  await Promise.all(promises)
  res.json({ queued: 15 })
})

app.post('/test/hit-limit', async (_req, res) => {
  const result = await apiLimiter.hit('test-key')
  res.json(result)
})

const port = 3000

await queue.ready()
await cron.start()

app.listen(port, () => console.log(`devtools dev server on :${port}`))

process.on('SIGINT', async () => {
  await cron.stop()
  await queue.close()
  await apiLimiter.close()
  await uploadLimiter.close()
  process.exit(0)
})
