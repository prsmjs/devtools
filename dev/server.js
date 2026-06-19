import express from 'express'
import cors from 'cors'
import { createServer as createHttpServer } from 'node:http'
import Queue from '@prsm/queue'
import { Cron } from '@prsm/cron'
import { slidingWindow, tokenBucket } from '@prsm/limit'
import { createGraph } from '@prsm/cells'
import { mutex, semaphore } from '@prsm/lock'
import WorkflowEngine, { defineWorkflow } from '@prsm/workflow'
import { postgresDriver } from '@prsm/workflow/postgres'
import { RealtimeServer } from '@prsm/realtime'
import { RealtimeClient } from '@prsm/realtime/client'
import { createCache } from '@prsm/cache'
import { createTracer } from '@prsm/trace'
import pg from 'pg'
import { createMeter } from '@prsm/meter'
import { postgresDriver as meterPostgres } from '@prsm/meter/postgres'
import { createEntitlements } from '@prsm/entitle'
import { postgresDriver as entitlePostgres } from '@prsm/entitle/postgres'
import { prsmDevtools } from '../src/index.js'

const tracer = createTracer({ service: 'devtools-dev' })

const app = express()
app.use(cors())
app.use(tracer.express())

const queue = new Queue({
  concurrency: 3,
  maxRetries: 2,
  timeout: '10s',
  groups: { concurrency: 1 },
  tracer,
})

queue.process(async (payload) => {
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000))
  if (Math.random() < 0.1) throw new Error('random failure')
  return { processed: true }
})

const emailQueue = new Queue({
  concurrency: 2,
  maxRetries: 3,
  timeout: '15s',
  tracer,
  redisOptions: { database: 1 },
})

emailQueue.process(async (payload) => {
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500))
  if (Math.random() < 0.05) throw new Error('smtp transient')
  return { sent: true, to: payload?.to }
})

const cron = new Cron({ tracer })

cron.add('heartbeat', '5s', async () => {
  return { ts: Date.now() }
})

cron.add('cleanup', '*/1 * * * *', async () => {
  return { cleaned: Math.floor(Math.random() * 10) }
})

const apiLimiter = slidingWindow({ max: 100, window: '1m', tracer })
const uploadLimiter = tokenBucket({ capacity: 10, refillRate: 2, refillInterval: '1s', tracer })

const g = createGraph({ prefix: 'portfolio:', tracer })

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

const health = createGraph({ prefix: 'health:', tracer })

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
      type: 'succeed',
      result: ({ data }) => ({ outcome: 'rejected', subject: data.subject }),
    },
  },
})

const batchHandlers = {
  fetchBatch: async ({ params, data }) => {
    await delay(300 + Math.random() * 400)
    const cursor = data.cursor ?? 0
    const remaining = Math.max(0, params.total - cursor)
    const lastFetched = Math.min(params.batchSize, remaining)
    return { cursor: cursor + lastFetched, lastFetched }
  },
  processBatch: async ({ data }) => {
    await delay(200 + Math.random() * 300)
    if (Math.random() < 0.08) throw new Error('downstream write rejected')
    return { processedThrough: data.cursor }
  },
}

// cyclic workflow: loops fetch -> process until the source is drained. exercises
// step re-entry (pass counters, step.reentered journal entries), handler-bound
// steps, and per-step params
const batchWorkflow = defineWorkflow({
  name: 'batch-processor',
  version: '1',
  start: 'fetch',
  cycles: true,
  steps: {
    fetch: {
      type: 'activity',
      label: 'Fetch batch',
      description: 'Pull the next page of records from the upstream source.',
      handler: 'fetchBatch',
      params: { batchSize: 10, total: 40 },
      maxPasses: 8,
      next: 'process',
    },
    process: {
      type: 'activity',
      label: 'Process batch',
      description: 'Transform and persist the fetched records.',
      handler: 'processBatch',
      params: { concurrency: 4 },
      maxPasses: 8,
      retry: { maxAttempts: 3, backoff: '2s' },
      next: 'more',
    },
    more: {
      type: 'decision',
      label: 'More records?',
      transitions: { yes: 'fetch', no: 'done' },
      decide: ({ data }) => (data.lastFetched > 0 ? 'yes' : 'no'),
    },
    done: {
      type: 'succeed',
      result: ({ data }) => ({ totalProcessed: data.cursor }),
    },
  },
}, { handlers: batchHandlers })

const workflow = new WorkflowEngine({
  storage: postgresDriver({
    connectionString: 'postgres://devtools:devtools_password@localhost:5544/devtools',
  }),
  pubsub: { socket: { host: '127.0.0.1', port: 6379 } },
  owner: 'devtools-dev',
  leaseMs: '30s',
  tracer,
})
workflow.register(enrichWorkflow)
workflow.register(ticketWorkflow)
workflow.register(batchWorkflow)

setInterval(() => {
  const subject = TICKET_SUBJECTS[Math.floor(Math.random() * TICKET_SUBJECTS.length)]
  workflow.start('ticket-triage', { subject }).catch(() => {})
}, 5000)

setInterval(() => {
  workflow.start('batch-processor', {}).catch(() => {})
}, 11000)

// occasionally pause then resume a live batch run so the paused state is dogfoodable
setInterval(async () => {
  try {
    const running = await workflow.listExecutions({ workflow: 'batch-processor' })
    const candidate = running.find((e) => ['queued', 'waiting', 'running'].includes(e.status))
    if (!candidate) return
    await workflow.pause(candidate.id, 'Paused by demo scheduler').catch(() => {})
    setTimeout(() => { workflow.resume(candidate.id).catch(() => {}) }, 9000)
  } catch {
    // postgres not ready yet
  }
}, 17000)

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

const jobLock = mutex({ redis: { host: '127.0.0.1', port: 6379 }, prefix: 'devtools-demo:mutex:', tracer })
const workerSlots = semaphore({
  max: 6,
  ttl: '40s',
  redis: { host: '127.0.0.1', port: 6379 },
  prefix: 'devtools-demo:sem:',
  tracer,
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

const realtime = new RealtimeServer({
  redis: { host: '127.0.0.1', port: 6379 },
  tracer,
  authenticateConnection: (req) => {
    const url = new URL(req.url, 'http://localhost')
    const user = url.searchParams.get('user') ?? `guest-${Math.random().toString(36).slice(2, 6)}`
    const role = url.searchParams.get('role') ?? 'viewer'
    return { user, role }
  },
})

realtime.exposeChannel(/^notifications$/)
realtime.exposeChannel(/^metrics:.+$/)
realtime.exposeChannel(/^chat:.+$/)

realtime.exposeRecord(/^doc:.+$/)
realtime.exposeRecord(/^cursor:.+$/)
realtime.exposeRecord(/^msg:.+$/)
realtime.exposeWritableRecord(/^cursor:.+$/)

const INBOX_MESSAGES = [
  { id: 'msg:1', subject: 'Welcome to prsm devtools', from: 'system', body: 'Realtime fixtures are live.' },
  { id: 'msg:2', subject: 'Your nightly build is ready', from: 'ci-bot', body: 'devtools@1.2.0 published successfully.' },
  { id: 'msg:3', subject: 'New issue filed: TICKET-471', from: 'amara', body: 'Limit panel chart is off by one tick.' },
  { id: 'msg:4', subject: 'Workflow ticket-triage failed twice', from: 'monitoring', body: 'Classifier timed out on inputs of length > 200.' },
  { id: 'msg:5', subject: 'Cron heartbeat skipped on instance-b', from: 'monitoring', body: 'Possible leader-election hiccup at 11:42.' },
]

for (const msg of INBOX_MESSAGES) {
  await realtime.writeRecord(msg.id, {
    ...msg,
    read: Math.random() < 0.4,
    receivedAt: Date.now() - Math.floor(Math.random() * 600000),
  })
}

realtime.exposeCollection(/^inbox$/, () => INBOX_MESSAGES.map((m) => ({ id: m.id })))

realtime.trackPresence(/^room:.+$/)

realtime.exposeCommand('echo', async (ctx) => ({ echoed: ctx.payload, by: ctx.connection.authData?.user }))
realtime.exposeCommand('coin-flip', async () => ({ result: Math.random() < 0.5 ? 'heads' : 'tails' }))

const DOC_BODIES = {
  'doc:welcome': { title: 'Welcome', body: 'Edit this doc to see realtime updates.', revision: 1 },
  'doc:roadmap': { title: 'Roadmap', items: ['ship devtools 1.2.0', 'add realtime fixtures', 'dogfood for a week'], revision: 1 },
}

for (const [id, value] of Object.entries(DOC_BODIES)) {
  await realtime.writeRecord(id, value)
}

const NOTIFY_MESSAGES = [
  { level: 'info', text: 'queue drained' },
  { level: 'warn', text: 'cron job took longer than usual' },
  { level: 'error', text: 'workflow ticket-triage failed' },
  { level: 'info', text: 'new ticket assigned to amara' },
  { level: 'info', text: 'lock released: report-generation' },
]

const CHAT_AUTHORS = ['amara', 'devon', 'priya', 'noor']
const CHAT_LINES = [
  'looking at the queue stats now',
  'classifier is flaky again',
  'i can take the next escalation',
  'pushed a fix to the limiter',
  'redis memory looks fine',
  'should we bump the cron interval?',
]

setInterval(() => {
  const msg = NOTIFY_MESSAGES[Math.floor(Math.random() * NOTIFY_MESSAGES.length)]
  realtime.writeChannel('notifications', { ...msg, ts: Date.now() }).catch(() => {})
}, 4000)

setInterval(() => {
  realtime.writeChannel('metrics:cpu', { value: Math.round(20 + Math.random() * 60), ts: Date.now() }).catch(() => {})
  realtime.writeChannel('metrics:rps', { value: Math.round(50 + Math.random() * 200), ts: Date.now() }).catch(() => {})
}, 2000)

setInterval(() => {
  const room = Math.random() < 0.6 ? 'chat:general' : 'chat:dev'
  const author = CHAT_AUTHORS[Math.floor(Math.random() * CHAT_AUTHORS.length)]
  const text = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)]
  realtime.writeChannel(room, { author, text, ts: Date.now() }).catch(() => {})
}, 3500)

setInterval(async () => {
  const id = Math.random() < 0.5 ? 'doc:welcome' : 'doc:roadmap'
  const current = DOC_BODIES[id]
  current.revision += 1
  if (id === 'doc:welcome') {
    current.body = `Edit this doc to see realtime updates. (rev ${current.revision})`
  } else {
    current.items = [...current.items.slice(-4), `revision ${current.revision} task`]
  }
  await realtime.writeRecord(id, current).catch(() => {})
}, 7000)

const userCache = createCache({
  redis: { host: '127.0.0.1', port: 6379 },
  prefix: 'demo-cache:users:',
  defaultTtl: '30s',
  tracer,
})
const trendingCache = createCache({
  redis: { host: '127.0.0.1', port: 6379 },
  prefix: 'demo-cache:trending:',
  defaultTtl: '5s',
  defaultStaleWhile: '20s',
  tracer,
})
await userCache.ready()
await trendingCache.ready()

const FAKE_USERS = {
  '1': { name: 'amara', tier: 'enterprise' },
  '2': { name: 'devon', tier: 'pro' },
  '3': { name: 'priya', tier: 'pro' },
  '4': { name: 'noor', tier: 'free' },
  '5': { name: 'kit', tier: 'free' },
}

async function loadUser(id) {
  tracer.addEvent('db.query', { table: 'users', userId: id })
  await delay(80 + Math.random() * 120)
  if (Math.random() < 0.2) tracer.addEvent('cache.miss-secondary-index', { userId: id })
  return FAKE_USERS[id] ?? null
}

async function loadTrending() {
  tracer.addEvent('external.api.call', { provider: 'trending-api', timeout: '500ms' })
  await delay(180 + Math.random() * 220)
  const tags = ['ai', 'redis', 'esm', 'vite', 'pg', 'realtime', 'cache']
  const shuffled = tags.slice().sort(() => Math.random() - 0.5).slice(0, 4)
  tracer.addEvent('compute.complete', { tagCount: shuffled.length })
  return { tags: shuffled, generatedAt: Date.now() }
}

setInterval(() => {
  tracer.span('scheduled.user-cache-poll', async () => {
    const userId = String(1 + Math.floor(Math.random() * 5))
    const tags = [`user:${userId}`, `tier:${FAKE_USERS[userId]?.tier ?? 'unknown'}`]
    await userCache.fetch(`user:${userId}`, () => loadUser(userId), { ttl: '30s', tags })
  }).catch(() => {})
}, 1100)

setInterval(() => {
  tracer.span('scheduled.trending-cache-poll', async () => {
    await trendingCache.fetch('global', loadTrending, { ttl: '5s', staleWhile: '20s' })
  }).catch(() => {})
}, 700)

setInterval(() => {
  tracer.span('scheduled.hot-key-burst', async () => {
    await Promise.all([
      userCache.fetch('user:1', () => loadUser('1')),
      userCache.fetch('user:1', () => loadUser('1')),
      userCache.fetch('user:1', () => loadUser('1')),
    ])
  }).catch(() => {})
}, 9000)

setInterval(() => {
  tracer.span('scheduled.pro-tier-invalidation', async () => {
    await userCache.invalidateTag('tier:pro')
  }).catch(() => {})
}, 23000)

const pgPool = new pg.Pool({
  connectionString: 'postgres://devtools:devtools_password@localhost:5544/devtools',
})

const meter = createMeter({
  driver: meterPostgres({ pool: pgPool, prefix: 'demo_meter' }),
  metrics: {
    api_calls: { unit: 'calls', aggregate: 'sum' },
    tokens: { unit: 'tokens', aggregate: 'sum' },
    seats: { unit: 'seats', aggregate: 'max' },
    storage: { unit: 'GB', aggregate: 'last' },
    active_users: { unit: 'users', aggregate: 'unique' },
  },
  period: 'month',
  tracer,
})
await meter.setup()

const entitle = createEntitlements({
  driver: entitlePostgres({ pool: pgPool, prefix: 'demo_entitle' }),
  plans: {
    free: {
      features: { api_access: true, sso: false, export_csv: false, priority_support: false },
      limits: { tokens: 10_000, api_calls: 1_000, seats: 1 },
    },
    pro: {
      features: { api_access: true, sso: true, export_csv: true, priority_support: false },
      limits: { tokens: 500_000, api_calls: 100_000, seats: 10 },
    },
    enterprise: {
      features: { api_access: true, sso: true, export_csv: true, priority_support: true },
      limits: { tokens: null, api_calls: null, seats: null },
    },
  },
  defaultPlan: 'free',
  // projects is declared but no plan grants it, to surface the known-but-unset case
  features: ['api_access', 'sso', 'export_csv', 'priority_support'],
  limits: ['tokens', 'api_calls', 'seats', 'projects'],
  meter,
  tracer,
})
await entitle.setup()

const METER_SUBJECTS = ['acct_amara', 'acct_devon', 'acct_noor']

await entitle.assign('acct_amara', 'enterprise')
await entitle.assign('acct_devon', 'pro')
await entitle.override('acct_devon', { limits: { seats: 25 } })
await entitle.override('acct_amara', { features: { priority_support: true } })

// seed a baseline of recorded usage so the inspector has something to show
for (const subject of METER_SUBJECTS) {
  await meter.record({ subject, metric: 'tokens', quantity: Math.floor(2000 + Math.random() * 6000) })
  await meter.record({ subject, metric: 'api_calls', quantity: Math.floor(50 + Math.random() * 400) })
  await meter.record({ subject, metric: 'seats', quantity: Math.floor(1 + Math.random() * 8) })
  await meter.record({ subject, metric: 'storage', quantity: +(Math.random() * 20).toFixed(1) })
  for (const u of ['u1', 'u2', 'u3']) await meter.record({ subject, metric: 'active_users', value: `${subject}-${u}` })
}

// keep usage moving so the dashboard is live
setInterval(() => {
  const subject = METER_SUBJECTS[Math.floor(Math.random() * METER_SUBJECTS.length)]
  meter.record({ subject, metric: 'tokens', quantity: Math.floor(Math.random() * 500) }).catch(() => {})
  meter.record({ subject, metric: 'api_calls', quantity: Math.floor(1 + Math.random() * 20) }).catch(() => {})
  if (Math.random() < 0.3) meter.record({ subject, metric: 'storage', quantity: +(Math.random() * 20).toFixed(1) }).catch(() => {})
}, 3000)

app.use(
  '/devtools',
  prsmDevtools({
    meter,
    entitle,
    queue: { default: queue, emails: emailQueue },
    cron,
    limit: { api: apiLimiter, uploads: uploadLimiter },
    cells: { portfolio: g, health },
    workflow,
    lock: { jobs: jobLock, 'worker-slots': workerSlots },
    realtime,
    cache: { users: userCache, trending: trendingCache },
    tracer,
    traceStore: { socket: { host: '127.0.0.1', port: 6379 } },
    connectionDisplay: (metadata) => ({
      label: metadata?.user,
      sublabel: metadata?.role,
    }),
  }),
)

app.post('/test/enqueue', async (req, res) => {
  const id = await queue.push({ name: 'test-job', ts: Date.now() })
  res.json({ id })
})

app.post('/test/enqueue-group', async (req, res) => {
  const groups = ['tenant-a', 'tenant-b', 'tenant-c']
  const group = groups[Math.floor(Math.random() * groups.length)]
  const id = await queue.push({ name: 'grouped-job', group, ts: Date.now() }, { group })
  res.json({ id, group })
})

app.post('/test/enqueue-email', async (req, res) => {
  const recipients = ['alice@example.com', 'bob@example.com', 'carol@example.com']
  const to = recipients[Math.floor(Math.random() * recipients.length)]
  const id = await emailQueue.push({ to, subject: 'Welcome', ts: Date.now() })
  res.json({ id, to })
})

app.post('/test/flood', async (_req, res) => {
  const promises = []
  for (let i = 0; i < 10; i++) promises.push(queue.push({ name: `flood-${i}` }))
  for (let i = 0; i < 5; i++) {
    const group = ['tenant-a', 'tenant-b'][i % 2]
    promises.push(queue.push({ name: `group-flood-${i}`, group }, { group }))
  }
  for (let i = 0; i < 6; i++) {
    promises.push(emailQueue.push({ to: `user${i}@example.com`, subject: 'Burst' }))
  }
  await Promise.all(promises)
  res.json({ queued: 21 })
})

app.post('/test/hit-limit', async (_req, res) => {
  const result = await apiLimiter.hit('test-key')
  res.json(result)
})

app.post('/test/order', async (_req, res) => {
  const userId = String(1 + Math.floor(Math.random() * 5))
  const rateOk = await apiLimiter.hit(`order:${userId}`)
  if (!rateOk.allowed) return res.status(429).json({ error: 'rate limited' })
  const user = await userCache.fetch(`user:${userId}`, async () => {
    await delay(60 + Math.random() * 80)
    return FAKE_USERS[userId] ?? null
  }, { ttl: '30s' })
  if (!user) return res.status(404).json({ error: 'user not found' })
  const trending = await trendingCache.fetch('global', async () => {
    await delay(120)
    return { tags: ['ai', 'redis'], at: Date.now() }
  }, { ttl: '5s', staleWhile: '20s' })
  const jobId = await queue.push({ kind: 'order', userId, trending: trending.tags })
  await realtime.writeChannel('notifications', { level: 'info', text: `order placed for ${user.name}`, ts: Date.now() }).catch(() => {})
  res.json({ ok: true, userId, jobId })
})

setInterval(async () => {
  const url = 'http://127.0.0.1:3000/test/order'
  await tracer.span('scheduled.synthetic-order', async () => {
    try { await tracer.fetch(url, { method: 'POST' }) } catch {}
  }).catch(() => {})
}, 2500)

const port = 3000

await queue.ready()
await emailQueue.ready()
await cron.start()
await workflow.startWorker({ interval: '200ms' })

const httpServer = createHttpServer(app)
await realtime.attach(httpServer, { port })
console.log(`devtools dev server on :${port}`)

const fakeUsers = [
  { user: 'amara', role: 'admin' },
  { user: 'devon', role: 'engineer' },
  { user: 'priya', role: 'engineer' },
  { user: 'noor', role: 'viewer' },
]

const simulatedClients = []

async function spawnSimulatedClient({ user, role }) {
  const url = `ws://127.0.0.1:${port}/?user=${encodeURIComponent(user)}&role=${encodeURIComponent(role)}`
  const client = new RealtimeClient(url, { logLevel: 4 })
  await client.connect()

  const room = Math.random() < 0.6 ? 'room:lobby' : 'room:dev'
  await client.joinRoom(room)
  await client.publishPresenceState(room, { status: 'online', user, role })

  await client.subscribeChannel('notifications', () => {})
  await client.subscribeChannel('metrics:cpu', () => {})
  if (Math.random() < 0.5) await client.subscribeChannel('chat:general', () => {})
  if (role !== 'viewer') await client.subscribeChannel('chat:dev', () => {})

  await client.subscribeRecord('doc:welcome', () => {})
  if (role !== 'viewer') await client.subscribeRecord('doc:roadmap', () => {})

  await client.subscribeCollection('inbox')

  setInterval(() => {
    client.writeRecord(`cursor:${user}`, { x: Math.round(Math.random() * 1000), y: Math.round(Math.random() * 600), ts: Date.now() }).catch(() => {})
  }, 2500 + Math.random() * 1500)

  setInterval(() => {
    const statuses = ['online', 'idle', 'typing']
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    client.publishPresenceState(room, { status, user, role }).catch(() => {})
  }, 6000 + Math.random() * 3000)

  return client
}

for (const u of fakeUsers) {
  const c = await spawnSimulatedClient(u).catch((err) => { console.error('client spawn failed', u.user, err.message); return null })
  if (c) simulatedClients.push(c)
}

console.log(`spawned ${simulatedClients.length} simulated realtime clients`)

process.on('SIGINT', async () => {
  for (const c of simulatedClients) await c.disconnect().catch(() => {})
  await realtime.close?.().catch(() => {})
  await cron.stop()
  await queue.close()
  await emailQueue.close()
  await apiLimiter.close()
  await uploadLimiter.close()
  await pgPool.end().catch(() => {})
  process.exit(0)
})
