import express from 'express'
import cors from 'cors'
import Queue from '@prsm/queue'
import { Cron } from '@prsm/cron'
import { slidingWindow, tokenBucket } from '@prsm/limit'
import { createGraph } from '@prsm/cells'
import { mutex, semaphore } from '@prsm/lock'
import WorkflowEngine, { defineWorkflow } from '@prsm/workflow'
import { postgresDriver } from '@prsm/workflow/postgres'
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

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const enrichWorkflow = defineWorkflow({
  name: 'enrich-customer',
  version: '1',
  start: 'lookup',
  steps: {
    lookup: {
      type: 'activity',
      next: 'score',
      retry: { maxAttempts: 2, backoff: '2s' },
      run: async () => {
        await delay(300 + Math.random() * 500)
        return { tier: ['free', 'pro', 'enterprise'][Math.floor(Math.random() * 3)] }
      },
    },
    score: {
      type: 'activity',
      next: 'done',
      run: async ({ steps }) => {
        await delay(200 + Math.random() * 400)
        return { tier: steps.lookup.output.tier, score: Math.floor(Math.random() * 100) }
      },
    },
    done: {
      type: 'succeed',
      result: ({ steps }) => ({ tier: steps.score.output.tier, score: steps.score.output.score }),
    },
  },
})

const TICKET_SUBJECTS = [
  'Cannot log in after password reset',
  'Billing charged twice this month',
  'Feature request: dark mode',
  'API returning 500 on /orders',
  'How do I export my data?',
  'WIN A FREE IPHONE CLICK NOW',
  'Webhook deliveries are delayed',
  'Upgrade my plan to enterprise',
]

const ticketWorkflow = defineWorkflow({
  name: 'ticket-triage',
  version: '1',
  start: 'classify',
  steps: {
    classify: {
      type: 'activity',
      next: 'route',
      timeout: '20s',
      retry: { maxAttempts: 3, backoff: '2s' },
      run: async ({ input }) => {
        await delay(400 + Math.random() * 700)
        if (Math.random() < 0.12) throw new Error('classifier service timeout')
        const roll = Math.random()
        const priority = roll < 0.3 ? 'urgent' : roll < 0.45 ? 'spam' : 'normal'
        return { priority, subject: input.subject }
      },
    },
    route: {
      type: 'decision',
      transitions: { urgent: 'enrich', normal: 'autoReply', spam: 'reject' },
      decide: ({ data }) => data.priority,
    },
    enrich: {
      type: 'subworkflow',
      workflow: 'enrich-customer',
      version: '1',
      input: ({ data }) => ({ subject: data.subject }),
      transitions: { succeeded: 'assign', failed: 'assign', canceled: 'assign' },
    },
    assign: {
      type: 'activity',
      next: 'awaitResolution',
      retry: { maxAttempts: 2, backoff: '2s' },
      run: async () => {
        await delay(300 + Math.random() * 500)
        return { assignedTo: ['amara', 'devon', 'priya'][Math.floor(Math.random() * 3)] }
      },
    },
    awaitResolution: {
      type: 'wait',
      timeout: '14s',
      transitions: { resolved: 'close', timeout: 'escalate' },
      resolve: ({ signal }) => signal.route,
    },
    escalate: {
      type: 'activity',
      next: 'close',
      run: async () => {
        await delay(300)
        return { escalatedTo: 'tier-2' }
      },
    },
    autoReply: {
      type: 'activity',
      next: 'close',
      run: async ({ data }) => {
        await delay(300 + Math.random() * 400)
        return { reply: `Auto-acknowledged: ${data.subject}` }
      },
    },
    close: {
      type: 'succeed',
      result: ({ data, steps }) => ({
        priority: data.priority,
        subject: data.subject,
        assignedTo: steps.assign?.output?.assignedTo ?? null,
      }),
    },
    reject: {
      type: 'fail',
      result: ({ data }) => ({ name: 'SpamRejected', message: `Rejected: ${data.subject}` }),
    },
  },
})

const workflow = new WorkflowEngine({
  storage: postgresDriver({
    connectionString: 'postgres://devtools:devtools_password@localhost:5544/devtools',
  }),
  owner: 'devtools-dev',
  leaseMs: '30s',
})
workflow.register(enrichWorkflow)
workflow.register(ticketWorkflow)

setInterval(() => {
  const subject = TICKET_SUBJECTS[Math.floor(Math.random() * TICKET_SUBJECTS.length)]
  workflow.start('ticket-triage', { subject }).catch(() => {})
}, 5000)

setInterval(async () => {
  try {
    const suspended = await workflow.listExecutions({ status: 'suspended' })
    for (const exec of suspended) {
      if (exec.workflow === 'ticket-triage' && exec.currentStep === 'awaitResolution' && Math.random() < 0.6) {
        await workflow.signal(exec.id, { route: 'resolved' }).catch(() => {})
      }
    }
  } catch {
    // postgres not ready yet
  }
}, 6000)

const jobLock = mutex({ redis: { host: '127.0.0.1', port: 6379 }, prefix: 'devtools-demo:mutex:' })
const workerSlots = semaphore({
  max: 6,
  ttl: '40s',
  redis: { host: '127.0.0.1', port: 6379 },
  prefix: 'devtools-demo:sem:',
})

const JOB_KEYS = ['report-generation', 'nightly-data-sync', 'cache-rebuild', 'index-compaction', 'invoice-batch']
const WORKERS = ['worker-alpha', 'worker-beta', 'worker-gamma', 'worker-delta']
const heldJobs = new Map()

async function jobLockTick() {
  if (heldJobs.size && (heldJobs.size >= JOB_KEYS.length || Math.random() < 0.45)) {
    const entries = [...heldJobs]
    const [key, id] = entries[Math.floor(Math.random() * entries.length)]
    await jobLock.release(key, id).catch(() => {})
    heldJobs.delete(key)
  } else {
    const free = JOB_KEYS.filter((k) => !heldJobs.has(k))
    if (free.length) {
      const key = free[Math.floor(Math.random() * free.length)]
      const holder = WORKERS[Math.floor(Math.random() * WORKERS.length)]
      const { acquired, id } = await jobLock.acquire(key, { ttl: '5m', id: holder })
      if (acquired) heldJobs.set(key, id)
    }
  }
}

const heldSlots = []

async function slotTick() {
  if (heldSlots.length && (heldSlots.length >= 6 || Math.random() < 0.4)) {
    const id = heldSlots.shift()
    await workerSlots.release('task-runners', id).catch(() => {})
  } else {
    const { acquired, id } = await workerSlots.acquire('task-runners')
    if (acquired) heldSlots.push(id)
  }
}

for (let i = 0; i < 3; i++) await jobLockTick()
for (let i = 0; i < 3; i++) await slotTick()

setInterval(() => { jobLockTick().catch(() => {}) }, 6000)
setInterval(() => { slotTick().catch(() => {}) }, 5000)
setInterval(() => {
  for (const id of heldSlots) workerSlots.renew('task-runners', id).catch(() => {})
}, 12000)

app.use(
  '/devtools',
  prsmDevtools({
    queue,
    cron,
    limit: { api: apiLimiter, uploads: uploadLimiter },
    cells: { portfolio: g, health },
    workflow,
    lock: { jobs: jobLock, 'worker-slots': workerSlots },
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
await workflow.startWorker({ interval: '200ms' })

app.listen(port, () => console.log(`devtools dev server on :${port}`))

process.on('SIGINT', async () => {
  await cron.stop()
  await queue.close()
  await apiLimiter.close()
  await uploadLimiter.close()
  process.exit(0)
})
