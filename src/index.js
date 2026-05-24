import { Router, static as serveStatic, json } from 'express'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from 'redis'

const __dirname = dirname(fileURLToPath(import.meta.url))
const clientDir = resolve(__dirname, '..', 'dist', 'client')

function normalizeCellGraphs(cells) {
  if (!cells) return null
  if (typeof cells.cell === 'function') return { default: cells }
  return cells
}

function normalizeQueues(queue) {
  if (!queue) return null
  if (typeof queue.push === 'function' && typeof queue.process === 'function') {
    return { default: queue }
  }
  return queue
}

function patternToString(p) {
  if (typeof p === 'string') return p
  if (p instanceof RegExp) return p.toString()
  return String(p)
}

/**
 * @param {Object} options
 * @param {import('@prsm/queue').default} [options.queue]
 * @param {import('@prsm/cron').Cron} [options.cron]
 * @param {Object<string, Object>} [options.limit] - named limiters
 * @param {import('@prsm/workflow').WorkflowEngine} [options.workflow]
 * @param {Object} [options.realtime] - RealtimeServer instance
 * @returns {import('express').Router}
 */
export function prsmDevtools(options = {}) {
  const router = Router()
  const { cron, limit, workflow, realtime, lock, cache, tracer } = options
  const queues = normalizeQueues(options.queue)
  const queueHistoryLimit = options.queueHistorySize ?? 200
  const traceLimit = options.traceBufferSize ?? 50000
  const traceRetentionMs = options.traceRetentionMs ?? 60 * 60 * 1000

  let traceRedis = null
  if (options.traceStore) {
    const ts = options.traceStore
    traceRedis = typeof ts.set === 'function' && typeof ts.get === 'function' ? ts : createClient(ts)
    if (!traceRedis.isOpen) {
      traceRedis.on?.('error', () => {})
      traceRedis.connect().catch(() => {})
    }
  }
  const SPAN_KEY = (traceId, spanId) => `devtools:span:${traceId}:${spanId}`
  const TRACE_SPANS_KEY = (traceId) => `devtools:trace-spans:${traceId}`
  const TRACE_INDEX = 'devtools:trace-index'

  function summarizeFromSpans(traceId, spans) {
    if (!spans.length) return null
    let firstStartedAt = Infinity
    let lastEndedAt = -Infinity
    const services = new Set()
    let status = 'ok'
    let root = null
    for (const s of spans) {
      if (s.startedAt < firstStartedAt) firstStartedAt = s.startedAt
      if (s.endedAt > lastEndedAt) lastEndedAt = s.endedAt
      services.add(s.service)
      if (s.status === 'error') status = 'error'
      if (!s.parentSpanId && !root) root = s
    }
    if (!root) root = spans.slice().sort((a, b) => a.startedAt - b.startedAt)[0]
    return {
      traceId,
      spans,
      firstStartedAt,
      lastEndedAt,
      services,
      status,
      rootName: root?.name ?? null,
      rootService: root?.service ?? null,
    }
  }

  async function persistSpan(span) {
    if (!traceRedis) return
    try {
      const ttlSec = Math.max(60, Math.floor(traceRetentionMs / 1000))
      const tx = traceRedis.multi()
      tx.set(SPAN_KEY(span.traceId, span.spanId), JSON.stringify(span), { EX: ttlSec })
      tx.sAdd(TRACE_SPANS_KEY(span.traceId), span.spanId)
      tx.expire(TRACE_SPANS_KEY(span.traceId), ttlSec)
      tx.zAdd(TRACE_INDEX, { score: span.endedAt, value: span.traceId })
      await tx.exec()
    } catch {}
  }

  async function loadTraceFromStore(id) {
    if (!traceRedis) return null
    try {
      const spanIds = await traceRedis.sMembers(TRACE_SPANS_KEY(id))
      if (!spanIds.length) return null
      const keys = spanIds.map((sid) => SPAN_KEY(id, sid))
      const raws = await traceRedis.mGet(keys)
      const spans = []
      for (const raw of raws) {
        if (!raw) continue
        try { spans.push(JSON.parse(raw)) } catch {}
      }
      if (!spans.length) return null
      return summarizeFromSpans(id, spans)
    } catch {
      return null
    }
  }

  async function listTraceIdsFromStore(limit, sinceMs) {
    if (!traceRedis) return []
    try {
      // ZREVRANGEBYSCORE: high score first; range is +inf..since
      const ids = await traceRedis.zRange(TRACE_INDEX, '+inf', sinceMs ?? 0, { BY: 'SCORE', REV: true, LIMIT: { offset: 0, count: limit } })
      return ids ?? []
    } catch {
      return []
    }
  }

  async function pruneStoreIndex() {
    if (!traceRedis || traceRetentionMs <= 0) return
    try {
      const cutoff = Date.now() - traceRetentionMs
      await traceRedis.zRemRangeByScore(TRACE_INDEX, 0, cutoff)
    } catch {}
  }
  const connectionDisplay = typeof options.connectionDisplay === 'function' ? options.connectionDisplay : null

  const traceMap = new Map()
  const traceOrder = []

  function sweepStaleTraces() {
    if (traceRetentionMs <= 0) return
    const cutoff = Date.now() - traceRetentionMs
    let removed = 0
    for (let i = 0; i < traceOrder.length; i++) {
      const id = traceOrder[i]
      const trace = traceMap.get(id)
      if (trace && trace.lastEndedAt < cutoff) {
        traceMap.delete(id)
        traceOrder[i] = null
        removed++
      } else if (trace) {
        break
      }
    }
    if (removed > 0) {
      const filtered = traceOrder.filter((x) => x !== null)
      traceOrder.length = 0
      traceOrder.push(...filtered)
    }
  }

  let sweepHandle = null
  if (tracer && traceRetentionMs > 0) {
    sweepHandle = setInterval(() => {
      sweepStaleTraces()
      pruneStoreIndex().catch(() => {})
    }, 30_000)
    if (typeof sweepHandle.unref === 'function') sweepHandle.unref()
  }

  function captureSpan(span) {
    let trace = traceMap.get(span.traceId)
    if (!trace) {
      trace = {
        traceId: span.traceId,
        spans: [],
        firstStartedAt: span.startedAt,
        lastEndedAt: span.endedAt,
        services: new Set(),
        status: 'ok',
        rootName: null,
        rootService: null,
      }
      traceMap.set(span.traceId, trace)
      traceOrder.push(span.traceId)
      while (traceOrder.length > traceLimit) {
        const evictId = traceOrder.shift()
        traceMap.delete(evictId)
      }
    }
    trace.spans.push(span)
    trace.firstStartedAt = Math.min(trace.firstStartedAt, span.startedAt)
    trace.lastEndedAt = Math.max(trace.lastEndedAt, span.endedAt)
    trace.services.add(span.service)
    if (span.status === 'error') trace.status = 'error'
    if (!span.parentSpanId) {
      trace.rootName = span.name
      trace.rootService = span.service
    }
    if (traceRedis) persistSpan(span).catch(() => {})
  }

  function displayFor(metadata) {
    if (!connectionDisplay) return { label: null, sublabel: null }
    try {
      const out = connectionDisplay(metadata) ?? {}
      const label = typeof out.label === 'string' && out.label.length ? out.label : null
      const sublabel = typeof out.sublabel === 'string' && out.sublabel.length ? out.sublabel : null
      return { label, sublabel }
    } catch {
      return { label: null, sublabel: null }
    }
  }
  const cellGraphs = normalizeCellGraphs(options.cells)
  const sseClients = new Set()
  const jsonBody = json()

  function broadcast(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const res of sseClients) {
      res.write(msg)
    }
  }

  if (tracer) {
    tracer.onSpan((span) => {
      try {
        captureSpan(span)
        broadcast('trace:span', span)
      } catch {}
    })
  }

  const queueHistory = new Map()
  if (queues) {
    for (const [qName] of Object.entries(queues)) {
      queueHistory.set(qName, [])
    }
    function pushQueueHistory(qName, kind, payload) {
      const ring = queueHistory.get(qName)
      if (!ring) return
      ring.unshift({ kind, ts: Date.now(), ...payload })
      if (ring.length > queueHistoryLimit) ring.length = queueHistoryLimit
    }
    function taskSummary(task) {
      if (!task) return null
      return { uuid: task.uuid, group: task.group ?? null, attempts: task.attempts, createdAt: task.createdAt, payload: task.payload }
    }
    for (const [qName, q] of Object.entries(queues)) {
      q.on('new', (data) => {
        const evt = { queue: qName, task: taskSummary(data?.task) }
        broadcast('queue:new', evt)
      })
      q.on('complete', (data) => {
        const entry = { task: taskSummary(data?.task), durationMs: data?.task ? Date.now() - data.task.createdAt : null }
        pushQueueHistory(qName, 'complete', entry)
        broadcast('queue:complete', { queue: qName, ...entry })
      })
      q.on('retry', (data) => {
        const entry = { task: taskSummary(data?.task), attempt: data?.attempt, error: data?.error?.message ?? null }
        pushQueueHistory(qName, 'retry', entry)
        broadcast('queue:retry', { queue: qName, ...entry })
      })
      q.on('failed', (data) => {
        const entry = { task: taskSummary(data?.task), error: data?.error?.message ?? null }
        pushQueueHistory(qName, 'failed', entry)
        broadcast('queue:failed', { queue: qName, ...entry })
      })
      q.on('drain', () => {
        broadcast('queue:drain', { queue: qName })
      })
    }
  }

  if (cron) {
    cron.on('fire', (data) => broadcast('cron:fire', { name: data.name, tickId: data.tickId }))
    cron.on('error', (data) => broadcast('cron:error', { name: data.name, error: data.error?.message }))
  }

  if (cellGraphs) {
    for (const [graphName, g] of Object.entries(cellGraphs)) {
      g.on((name, value, state) => {
        broadcast('cells:change', { graph: graphName, name, value, status: state.status, updatedAt: state.updatedAt })
      })
    }
  }

  if (workflow) {
    for (const event of [
      'execution:queued',
      'execution:succeeded',
      'execution:failed',
      'execution:canceled',
      'execution:lease-lost',
      'step:started',
      'step:succeeded',
      'step:routed',
      'step:retry',
      'step:failed',
    ]) {
      workflow.on(event, (data) => broadcast(`workflow:${event}`, data ?? {}))
    }
  }

  if (cache) {
    for (const [name, c] of Object.entries(cache)) {
      const events = ['hit', 'miss', 'set', 'del', 'invalidate', 'refresh', 'stampede:lead', 'stampede:wait', 'stampede:result', 'stampede:timeout', 'error']
      for (const ev of events) {
        c.on(ev, (data) => broadcast(`cache:${ev}`, { cache: name, ...(data ?? {}) }))
      }
    }
  }

  router.get('/api/config', (_req, res) => {
    res.json({
      queue: queues ? Object.keys(queues) : [],
      cron: !!cron,
      limit: limit ? Object.keys(limit) : [],
      workflow: !!workflow,
      realtime: !!realtime,
      cells: cellGraphs ? Object.keys(cellGraphs) : [],
      lock: lock ? Object.keys(lock) : [],
      cache: cache ? Object.keys(cache) : [],
      trace: !!tracer,
    })
  })

  if (tracer) {
    function summarizeTrace(trace) {
      const sorted = trace.spans.slice().sort((a, b) => a.startedAt - b.startedAt)
      const root = sorted.find((s) => !s.parentSpanId) ?? sorted[0]
      return {
        traceId: trace.traceId,
        startedAt: trace.firstStartedAt,
        endedAt: trace.lastEndedAt,
        durationMs: trace.lastEndedAt - trace.firstStartedAt,
        spanCount: trace.spans.length,
        services: [...trace.services],
        status: trace.status,
        rootName: root?.name ?? trace.rootName ?? null,
        rootService: root?.service ?? trace.rootService ?? null,
      }
    }

    router.get('/api/traces', async (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 100, 500)
      const since = Number(req.query.since) || 0
      const status = req.query.status
      const service = req.query.service
      const list = []

      if (traceRedis) {
        const ids = await listTraceIdsFromStore(limit * 2, since)
        for (const id of ids) {
          const trace = await loadTraceFromStore(id)
          if (!trace) continue
          if (trace.lastEndedAt < since) continue
          if (status && trace.status !== status) continue
          if (service && !trace.services.has(service)) continue
          list.push(summarizeTrace(trace))
          if (list.length >= limit) break
        }
      } else {
        for (let i = traceOrder.length - 1; i >= 0; i--) {
          const trace = traceMap.get(traceOrder[i])
          if (!trace) continue
          if (trace.lastEndedAt < since) continue
          if (status && trace.status !== status) continue
          if (service && !trace.services.has(service)) continue
          list.push(summarizeTrace(trace))
          if (list.length >= limit) break
        }
      }

      res.json({ traces: list })
    })

    router.get('/api/traces/:id', async (req, res) => {
      const trace = traceRedis
        ? await loadTraceFromStore(req.params.id)
        : traceMap.get(req.params.id)
      if (!trace) return res.status(404).json({ error: 'trace not found' })
      const spans = trace.spans.slice().sort((a, b) => a.startedAt - b.startedAt)
      res.json({
        ...summarizeTrace(trace),
        spans,
      })
    })
  }

  if (cache) {
    router.get('/api/cache', (_req, res) => {
      const out = {}
      for (const [name, c] of Object.entries(cache)) {
        out[name] = c.stats()
      }
      res.json(out)
    })

    router.get('/api/cache/:name', (req, res) => {
      const c = cache[req.params.name]
      if (!c) return res.status(404).json({ error: 'cache not found' })
      res.json({ name: req.params.name, stats: c.stats() })
    })
  }

  router.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    sseClients.add(res)
    req.on('close', () => sseClients.delete(res))
  })

  if (queues) {
    router.get('/api/queue', async (_req, res) => {
      const out = {}
      for (const [name, q] of Object.entries(queues)) {
        try {
          out[name] = await q.snapshot()
        } catch (err) {
          out[name] = { error: err?.message ?? 'snapshot failed', inFlight: q.inFlight }
        }
      }
      res.json(out)
    })

    router.get('/api/queue/:name', async (req, res) => {
      const q = queues[req.params.name]
      if (!q) return res.status(404).json({ error: 'queue not found' })
      try {
        const includePayload = req.query.payload === '1'
        const snap = await q.snapshot({ includePayload })
        res.json({ name: req.params.name, ...snap })
      } catch (err) {
        res.status(500).json({ error: err?.message ?? 'snapshot failed' })
      }
    })

    router.get('/api/queue/:name/history', (req, res) => {
      const ring = queueHistory.get(req.params.name)
      if (!ring) return res.status(404).json({ error: 'queue not found' })
      const limit = Math.min(Number(req.query.limit) || queueHistoryLimit, queueHistoryLimit)
      res.json({ entries: ring.slice(0, limit) })
    })
  }

  if (cron) {
    router.get('/api/cron', (_req, res) => {
      const jobs = cron.jobs.map((name) => ({
        name,
        nextFireTime: cron.nextFireTime(name),
      }))
      res.json({ jobs })
    })

    router.post('/api/cron/:name/run', async (req, res) => {
      if (typeof cron.run !== 'function') {
        return res.status(400).json({ error: 'This @prsm/cron version does not support manual runs' })
      }
      try {
        const result = await cron.run(req.params.name)
        res.json(result)
      } catch (err) {
        res.status(400).json({ error: err.message })
      }
    })
  }

  if (limit) {
    router.get('/api/limits', (_req, res) => {
      res.json({ limiters: Object.keys(limit) })
    })

    router.get('/api/limits/:name/keys', async (req, res) => {
      const limiter = limit[req.params.name]
      if (!limiter) return res.status(404).json({ error: 'Limiter not found' })
      if (!limiter.keys) {
        return res.status(400).json({ error: 'This @prsm/limit version does not support key listing' })
      }
      try {
        const n = req.query.limit ? Number(req.query.limit) : undefined
        const keys = await limiter.keys(n ? { limit: n } : undefined)
        res.json({ keys })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    router.get('/api/limits/:name/peek/:key', async (req, res) => {
      const limiter = limit[req.params.name]
      if (!limiter) return res.status(404).json({ error: 'Limiter not found' })
      if (!limiter.peek) return res.status(400).json({ error: 'Limiter does not support peek' })

      try {
        const result = await limiter.peek(req.params.key)
        res.json(result)
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    router.post('/api/limits/:name/reset/:key', async (req, res) => {
      const limiter = limit[req.params.name]
      if (!limiter) return res.status(404).json({ error: 'Limiter not found' })
      if (!limiter.reset) return res.status(400).json({ error: 'Limiter does not support reset' })

      try {
        await limiter.reset(req.params.key)
        res.json({ ok: true })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })
  }

  if (workflow) {
    router.get('/api/workflows', (_req, res) => {
      const workflows = workflow.listWorkflows().map((item) => ({
        ...item,
        graph: workflow.describe(item.name, item.version).graph,
      }))
      res.json({ workflows })
    })

    router.get('/api/workflows/describe', (req, res) => {
      const name = req.query.name
      const version = req.query.version

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name is required' })
      }

      try {
        const data = workflow.describe(name, typeof version === 'string' ? version : undefined)
        res.json(data)
      } catch (error) {
        res.status(404).json({ error: error.message })
      }
    })

    router.get('/api/workflow/executions', async (req, res) => {
      const filter = {}
      if (typeof req.query.workflow === 'string' && req.query.workflow) filter.workflow = req.query.workflow
      if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status
      if (typeof req.query.limit === 'string' && req.query.limit) filter.limit = Number(req.query.limit)

      const executions = await workflow.listExecutions(filter)
      res.json({ executions })
    })

    router.get('/api/workflow/executions/:id', async (req, res) => {
      const execution = await workflow.getExecution(req.params.id)
      if (!execution) return res.status(404).json({ error: 'Execution not found' })
      res.json({ execution })
    })

    router.post('/api/workflow/start', jsonBody, async (req, res) => {
      const { name, version, input } = req.body || {}
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name is required' })
      }
      try {
        const execution = await workflow.start(name, input ?? {}, version ? { version } : undefined)
        res.json({ id: execution.id })
      } catch (err) {
        res.status(400).json({ error: err.message })
      }
    })

    router.post('/api/workflow/executions/:id/signal', jsonBody, async (req, res) => {
      try {
        const execution = await workflow.signal(req.params.id, req.body?.payload ?? {})
        res.json({ execution })
      } catch (err) {
        const status = err.name === 'AlreadySignaledError' ? 409 : 400
        res.status(status).json({ error: err.message })
      }
    })

    router.post('/api/workflow/executions/:id/cancel', jsonBody, async (req, res) => {
      try {
        const execution = await workflow.cancel(req.params.id, req.body?.reason)
        res.json({ execution })
      } catch (err) {
        res.status(400).json({ error: err.message })
      }
    })

    router.post('/api/workflow/executions/:id/resume', async (req, res) => {
      try {
        const execution = await workflow.resume(req.params.id)
        res.json({ execution })
      } catch (err) {
        res.status(400).json({ error: err.message })
      }
    })
  }

  if (realtime) {
    realtime.onRecordUpdate(({ recordId, value }) => {
      broadcast('realtime:record:update', { recordId, data: value })
    })

    realtime.onRecordRemoved(({ recordId }) => {
      broadcast('realtime:record:removed', { recordId })
    })

    router.get('/api/realtime/state', async (_req, res) => {
      try {
        const connIds = await realtime.connectionManager.getAllConnectionIds()
        const allMeta = await realtime.connectionManager._getMetadataForConnectionIds(connIds)
        const localConns = realtime.connectionManager.getLocalConnections()
        const localMap = {}
        for (const conn of localConns) {
          localMap[conn.id] = conn
        }

        const connections = allMeta.map(({ id, metadata }) => {
          const local = localMap[id]
          return {
            id,
            metadata,
            ...displayFor(metadata),
            local: !!local,
            latency: local?.latency?.ms ?? null,
            alive: local?.alive ?? null,
            remoteAddress: local?.remoteAddress ?? null,
          }
        })

        const roomNames = await realtime.roomManager.getAllRooms()
        const rooms = []
        for (const name of roomNames) {
          const members = await realtime.roomManager.getRoomConnectionIds(name)
          const statesMap = await realtime.presenceManager.getAllPresenceStates(name)
          const presence = {}
          statesMap.forEach((state, connId) => { presence[connId] = state })
          rooms.push({ name, members, presence })
        }

        const channels = {}
        for (const [channel, subscribers] of Object.entries(realtime.channelManager.channelSubscriptions)) {
          if (channel.startsWith('rt:presence:updates:')) continue
          channels[channel] = [...subscribers].map((c) => c.id)
        }

        const collections = {}
        realtime.collectionManager.collectionSubscriptions.forEach((subs, collId) => {
          const subscribers = {}
          subs.forEach((info, connId) => { subscribers[connId] = info })
          collections[collId] = { subscribers }
        })

        const records = {}
        realtime.recordSubscriptionManager.recordSubscriptions.forEach((subs, recordId) => {
          const subscribers = {}
          subs.forEach((mode, connId) => { subscribers[connId] = mode })
          records[recordId] = { subscribers }
        })

        const exposed = {
          channels: realtime.channelManager.exposedChannels.map(patternToString),
          records: realtime.recordSubscriptionManager.exposedRecords.map(patternToString),
          writableRecords: realtime.recordSubscriptionManager.exposedWritableRecords.map(patternToString),
          collections: realtime.collectionManager.exposedCollections.map((e) => patternToString(e.pattern)),
          presence: realtime.presenceManager.trackedRooms.map(patternToString),
          commands: realtime.commandManager.commands
            ? Object.keys(realtime.commandManager.commands).filter((c) => !c.startsWith('rt/'))
            : [],
        }

        res.json({ instanceId: realtime.instanceId, connections, rooms, channels, collections, records, exposed })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    router.get('/api/realtime/connection/:id', async (req, res) => {
      try {
        const { id } = req.params
        const metadata = await realtime.connectionManager.getMetadata(id)
        const rooms = await realtime.roomManager.getRoomsForConnection(id)

        const presence = {}
        for (const room of rooms) {
          const state = await realtime.presenceManager.getPresenceState(id, room)
          if (state) presence[room] = state
        }

        const channels = []
        for (const [channel, subscribers] of Object.entries(realtime.channelManager.channelSubscriptions)) {
          if (channel.startsWith('rt:presence:updates:')) continue
          for (const conn of subscribers) {
            if (conn.id === id) { channels.push(channel); break }
          }
        }

        const collections = []
        realtime.collectionManager.collectionSubscriptions.forEach((subs, collId) => {
          if (subs.has(id)) collections.push({ id: collId, ...subs.get(id) })
        })

        const records = []
        realtime.recordSubscriptionManager.recordSubscriptions.forEach((subs, recordId) => {
          if (subs.has(id)) records.push({ id: recordId, mode: subs.get(id) })
        })

        const local = realtime.connectionManager.getLocalConnection(id)

        res.json({
          id,
          metadata,
          ...displayFor(metadata),
          rooms,
          presence,
          channels,
          collections,
          records,
          local: !!local,
          latency: local?.latency?.ms ?? null,
          alive: local?.alive ?? null,
          remoteAddress: local?.remoteAddress ?? null,
        })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    router.get('/api/realtime/room/:name', async (req, res) => {
      try {
        const { name } = req.params
        const membersWithMeta = await realtime.getRoomMembersWithMetadata(name)
        const statesMap = await realtime.presenceManager.getAllPresenceStates(name)
        const presence = {}
        statesMap.forEach((state, connId) => { presence[connId] = state })
        res.json({ name, members: membersWithMeta, presence })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    router.get('/api/realtime/record/:id', async (req, res) => {
      try {
        const data = await realtime.recordManager.getRecord(req.params.id)
        res.json({ id: req.params.id, data })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    router.get('/api/realtime/collection/:id/records', async (req, res) => {
      try {
        const collId = req.params.id
        const connId = req.query.connId
        if (!connId) return res.status(400).json({ error: 'connId query param required' })

        const raw = await realtime.redisManager.redis.get(`rt:collection:${collId}:${connId}`)
        if (!raw) return res.json({ recordIds: [], records: [] })

        const recordIds = JSON.parse(raw)
        const records = []
        for (const rid of recordIds) {
          const data = await realtime.recordManager.getRecord(rid)
          records.push({ id: rid, data })
        }
        res.json({ recordIds, records })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })
  }

  if (cellGraphs) {
    router.get('/api/cells/:graph', (req, res) => {
      const g = cellGraphs[req.params.graph]
      if (!g) return res.status(404).json({ error: 'graph not found' })
      const topology = g.cells()
      const snapshot = g.snapshot()
      const enriched = topology.map((c) => {
        const state = g.get(c.name)
        return {
          ...c,
          value: snapshot[c.name],
          error: state?.error ? String(state.error.message || state.error) : null,
          updatedAt: state?.updatedAt ?? null,
          computeTime: state?.computeTime ?? null,
        }
      })
      res.json({ graph: req.params.graph, cells: enriched })
    })

    router.get('/api/cells/:graph/:name/history', (req, res) => {
      const g = cellGraphs[req.params.graph]
      if (!g) return res.status(404).json({ error: 'graph not found' })
      const limit = req.query.limit ? Number(req.query.limit) : undefined
      try {
        const entries = g.history(req.params.name, limit)
        res.json({ graph: req.params.graph, name: req.params.name, entries })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })
  }

  if (lock) {
    router.get('/api/locks', async (_req, res) => {
      const managers = []
      for (const [name, manager] of Object.entries(lock)) {
        const kind = typeof manager.renew === 'function' ? 'semaphore' : 'mutex'
        try {
          managers.push({ name, kind, locks: await manager.list() })
        } catch (err) {
          managers.push({ name, kind, locks: [], error: err.message })
        }
      }
      res.json({ managers })
    })

    router.get('/api/locks/:name', async (req, res) => {
      const manager = lock[req.params.name]
      if (!manager) return res.status(404).json({ error: 'Lock manager not found' })
      try {
        const kind = typeof manager.renew === 'function' ? 'semaphore' : 'mutex'
        const locks = await manager.list()
        res.json({ name: req.params.name, kind, locks })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })

    router.post('/api/locks/:name/release', jsonBody, async (req, res) => {
      const manager = lock[req.params.name]
      if (!manager) return res.status(404).json({ error: 'Lock manager not found' })
      const { key, id } = req.body || {}
      if (!key || !id) return res.status(400).json({ error: 'key and id are required' })
      try {
        const released = await manager.release(key, id)
        res.json({ released })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })
  }

  if (existsSync(clientDir)) {
    const indexPath = resolve(clientDir, 'index.html')
    const indexHtml = readFileSync(indexPath, 'utf8')
    router.use(serveStatic(clientDir, { index: false }))
    router.get('*', (req, res) => {
      const base = req.baseUrl ? `${req.baseUrl}/` : '/'
      res.type('html').send(indexHtml.replace('<head>', `<head>\n    <base href="${base}">`))
    })
  }

  return router
}

export default prsmDevtools
