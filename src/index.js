import { Router, static as serveStatic } from 'express'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const clientDir = resolve(__dirname, '..', 'dist', 'client')

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
  const { queue, cron, limit, workflow, realtime } = options
  const sseClients = new Set()

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
  }

  if (limit) {
    router.get('/api/limits', (_req, res) => {
      res.json({ limiters: Object.keys(limit) })
    })

    router.get('/api/limits/:name/peek/:key', async (req, res) => {
      const limiter = limit[req.params.name]
      if (!limiter) return res.status(404).json({ error: 'Limiter not found' })
      if (!limiter.peek) return res.status(400).json({ error: 'Limiter does not support peek' })

      const result = await limiter.peek(req.params.key)
      res.json(result)
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

  if (existsSync(clientDir)) {
    router.use(serveStatic(clientDir))
    router.get('*', (_req, res) => {
      res.sendFile(resolve(clientDir, 'index.html'))
    })
  }

  return router
}

export default prsmDevtools
