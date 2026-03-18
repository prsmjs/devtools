import express from 'express'
import cors from 'cors'
import Queue from '@prsm/queue'
import { Cron } from '@prsm/cron'
import { slidingWindow, tokenBucket } from '@prsm/limit'
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

app.use(
  '/devtools',
  prsmDevtools({
    queue,
    cron,
    limit: { api: apiLimiter, uploads: uploadLimiter },
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
