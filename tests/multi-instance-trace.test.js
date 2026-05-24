import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer } from 'node:http'
import { createClient } from 'redis'
import { createTracer } from '@prsm/trace'
import { prsmDevtools } from '../src/index.js'

const REDIS = { socket: { host: '127.0.0.1', port: 6379 } }
let admin

async function flush() {
  if (!admin) {
    admin = createClient(REDIS)
    admin.on('error', () => {})
    await admin.connect()
  }
  await admin.keys('devtools:*').then(async (keys) => {
    if (keys.length) await admin.del(keys)
  })
}

async function bootInstance(tracer) {
  const app = express()
  app.use('/devtools', prsmDevtools({ tracer, traceStore: REDIS }))
  const httpServer = createServer(app)
  await new Promise((resolve) => httpServer.listen(0, resolve))
  const port = httpServer.address().port
  return {
    port,
    async close() { await new Promise((r) => httpServer.close(r)) },
    async fetch(path) {
      const r = await fetch(`http://127.0.0.1:${port}${path}`)
      return r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
    },
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

beforeEach(async () => { await flush() })
afterEach(async () => { await flush() })

describe('devtools multi-instance trace collection', () => {
  it('two instances writing to same Redis produce one merged trace', async () => {
    // shared traceId, spans authored by two different tracers (simulating two app instances)
    const tracerA = createTracer({ service: 'svc-a' })
    const tracerB = createTracer({ service: 'svc-b' })

    const a = await bootInstance(tracerA)
    const b = await bootInstance(tracerB)

    // sanity: instance A creates a root span
    const handleA = tracerA.startSpan('http.GET', { instance: 'a' }, { kind: 'server' })
    handleA.end()
    await sleep(80)

    // sanity: instance B creates a child of A's span in the same trace
    const handleB = tracerB.startSpan('queue.process', { instance: 'b' }, {
      kind: 'consumer',
      parent: handleA.context,
    })
    handleB.end()
    await sleep(120)

    // either instance's API should return the unified trace
    const detailFromA = await a.fetch(`/devtools/api/traces/${handleA.context.traceId}`)
    expect(detailFromA.spans).toHaveLength(2)
    const namesA = detailFromA.spans.map((s) => s.name).sort()
    expect(namesA).toEqual(['http.GET', 'queue.process'])
    expect(detailFromA.services.sort()).toEqual(['svc-a', 'svc-b'])

    const detailFromB = await b.fetch(`/devtools/api/traces/${handleA.context.traceId}`)
    expect(detailFromB.spans).toHaveLength(2)

    await a.close()
    await b.close()
  })

  it('list endpoint surfaces traces written by other instances', async () => {
    const tracerA = createTracer({ service: 'svc-a' })
    const tracerB = createTracer({ service: 'svc-b' })
    const a = await bootInstance(tracerA)
    const b = await bootInstance(tracerB)

    // only tracerA emits spans
    const handle = tracerA.startSpan('http.POST', {}, { kind: 'server' })
    handle.end()
    await sleep(80)

    // tracerB's devtools should still see the trace (via Redis)
    const list = await b.fetch('/devtools/api/traces')
    const ids = list.traces.map((t) => t.traceId)
    expect(ids).toContain(handle.context.traceId)

    await a.close()
    await b.close()
  })

  it('parent-child relationship is preserved across instances', async () => {
    const tracerA = createTracer({ service: 'svc-a' })
    const tracerB = createTracer({ service: 'svc-b' })
    const a = await bootInstance(tracerA)
    const b = await bootInstance(tracerB)

    const parent = tracerA.startSpan('producer', {}, { kind: 'producer' })
    parent.end()

    // simulate cross-network: B picks up the trace context from a serialized header
    const headers = {}
    const ctxForInject = { ...parent.context }
    tracerA.inject = ((orig) => (h) => {
      const ctx = parent.context
      h.traceparent = tracerA.toTraceparent(ctx)
      return h
    })(tracerA.inject)
    tracerA.inject(headers)

    const fromHeader = tracerB.fromTraceparent(headers.traceparent)
    const child = tracerB.startSpan('consumer', {}, {
      kind: 'consumer',
      parent: { traceId: fromHeader.traceId, spanId: fromHeader.parentSpanId, sampled: fromHeader.sampled },
    })
    child.end()
    await sleep(120)

    const detail = await b.fetch(`/devtools/api/traces/${parent.context.traceId}`)
    expect(detail.spans).toHaveLength(2)
    const consumer = detail.spans.find((s) => s.name === 'consumer')
    expect(consumer.parentSpanId).toBe(parent.context.spanId)
    expect(consumer.traceId).toBe(parent.context.traceId)

    await a.close()
    await b.close()
  })

  it('concurrent writes from both instances to the same trace do not lose spans', async () => {
    const tracerA = createTracer({ service: 'svc-a' })
    const tracerB = createTracer({ service: 'svc-b' })
    const a = await bootInstance(tracerA)
    const b = await bootInstance(tracerB)

    const root = tracerA.startSpan('root', {}, { kind: 'server' })

    const N = 10
    const all = []
    for (let i = 0; i < N; i++) {
      const fromA = tracerA.startSpan(`a-${i}`, {}, { parent: root.context })
      const fromB = tracerB.startSpan(`b-${i}`, {}, { parent: root.context })
      all.push(fromA, fromB)
    }
    for (const h of all) h.end()
    root.end()
    await sleep(250)

    const detail = await a.fetch(`/devtools/api/traces/${root.context.traceId}`)
    expect(detail.spans.length).toBe(N * 2 + 1)
    const names = detail.spans.map((s) => s.name).sort()
    for (let i = 0; i < N; i++) {
      expect(names).toContain(`a-${i}`)
      expect(names).toContain(`b-${i}`)
    }

    await a.close()
    await b.close()
  })
})
