import { Router, static as serveStatic, json } from 'express'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const clientDir = resolve(__dirname, '..', 'dist', 'client')

function normalizeCellGraphs(cells) {
  if (!cells) return null
  if (typeof cells.cell === 'function') return { default: cells }
  return cells
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
  const { queue, cron, limit, workflow, realtime, lock } = options
  const cellGraphs = normalizeCellGraphs(options.cells)
  const sseClients = new Set()
  const jsonBody = json()

  function broadcast(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const res of sseClients) {
      res.write(msg)
    }
  }

  if (queue) {
    for (const event of ['new', 'complete', 'retry', 'failed', 'drain']) {
      queue.on(event, (data) => broadcast(`queue:${event}`, data ?? {}))
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

  router.get('/api/config', (_req, res) => {
    res.json({
      queue: !!queue,
      cron: !!cron,
      limit: limit ? Object.keys(limit) : [],
      workflow: !!workflow,
      realtime: !!realtime,
      cells: cellGraphs ? Object.keys(cellGraphs) : [],
      lock: lock ? Object.keys(lock) : [],
    })
  })

  router.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    sseClients.add(res)
    req.on('close', () => sseClients.delete(res))
  })

  if (queue) {
    router.get('/api/queue', (_req, res) => {
      res.json({ inFlight: queue.inFlight })
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
