import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import { createServer } from 'node:http'
import { createMeter } from '@prsm/meter'
import { memoryDriver as meterMemory } from '@prsm/meter/memory'
import { createEntitlements } from '@prsm/entitle'
import { memoryDriver as entitleMemory } from '@prsm/entitle/memory'
import { prsmDevtools } from '../src/index.js'

const METRICS = {
  tokens: { unit: 'tokens', aggregate: 'sum' },
  seats: { unit: 'seats', aggregate: 'max' },
  active_users: { unit: 'users', aggregate: 'unique' },
}

const PLANS = {
  free: { features: { api: true, sso: false }, limits: { tokens: 1000, seats: 1 } },
  pro: { features: { api: true, sso: true }, limits: { tokens: 100000, seats: 10 } },
}

let server, port, meter, entitle

async function get(path) {
  const r = await fetch(`http://127.0.0.1:${port}${path}`)
  const body = await r.json().catch(() => ({}))
  return { status: r.status, body }
}

beforeAll(async () => {
  meter = createMeter({ driver: meterMemory(), metrics: METRICS, period: 'month' })
  await meter.setup()
  await meter.record({ subject: 'acct_1', metric: 'tokens', quantity: 400 })
  await meter.record({ subject: 'acct_1', metric: 'tokens', quantity: 200 })
  await meter.record({ subject: 'acct_1', metric: 'seats', quantity: 3 })

  entitle = createEntitlements({
    driver: entitleMemory(),
    plans: PLANS,
    defaultPlan: 'free',
    features: ['api', 'sso'],
    limits: ['tokens', 'seats'],
    meter,
  })
  await entitle.setup()
  await entitle.assign('acct_1', 'pro')
  await entitle.override('acct_1', { limits: { seats: 25 } })

  const app = express()
  app.use('/devtools', prsmDevtools({ meter, entitle }))
  server = createServer(app)
  await new Promise((r) => server.listen(0, r))
  port = server.address().port
})

afterAll(async () => {
  await new Promise((r) => server.close(r))
  await meter.close()
  await entitle.close()
})

describe('devtools meter support', () => {
  it('advertises meter and entitle in config', async () => {
    const { body } = await get('/devtools/api/config')
    expect(body.meter).toEqual(['default'])
    expect(body.entitle).toEqual(['default'])
  })

  it('exposes the meter catalog', async () => {
    const { body } = await get('/devtools/api/meter/default/catalog')
    expect(body.period).toBe('month')
    expect(body.metrics).toEqual(METRICS)
  })

  it('summarizes a subject across every metric', async () => {
    const { body } = await get('/devtools/api/meter/default/summary?subject=acct_1')
    expect(body.subject).toBe('acct_1')
    const byMetric = Object.fromEntries(body.metrics.map((m) => [m.metric, m.quantity]))
    expect(byMetric).toEqual({ tokens: 600, seats: 3, active_users: 0 })
  })

  it('reads windowed usage', async () => {
    const { body } = await get('/devtools/api/meter/default/usage?subject=acct_1&metric=tokens&period=day')
    expect(body).toMatchObject({ metric: 'tokens', quantity: 600, unit: 'tokens', aggregate: 'sum' })
  })

  it('checks usage against a quota', async () => {
    const { body } = await get('/devtools/api/meter/default/check?subject=acct_1&metric=tokens&limit=1000')
    expect(body).toMatchObject({ allowed: true, used: 600, remaining: 400, limit: 1000 })
  })

  it('requires a subject for summary', async () => {
    const { status, body } = await get('/devtools/api/meter/default/summary')
    expect(status).toBe(400)
    expect(body.error).toMatch(/subject/)
  })

  it('404s an unknown meter name', async () => {
    const { status } = await get('/devtools/api/meter/nope/catalog')
    expect(status).toBe(404)
  })
})

describe('devtools entitle support', () => {
  it('exposes the plan catalog', async () => {
    const { body } = await get('/devtools/api/entitle/default/catalog')
    expect(body.defaultPlan).toBe('free')
    expect(body.plans).toEqual(PLANS)
    expect([...body.features].sort()).toEqual(['api', 'sso'])
    expect([...body.limits].sort()).toEqual(['seats', 'tokens'])
  })

  it('describes a subject effective entitlements with overrides applied', async () => {
    const { body } = await get('/devtools/api/entitle/default/describe?subject=acct_1')
    expect(body.subject).toBe('acct_1')
    expect(body.plan).toBe('pro')
    expect(body.features).toEqual({ api: true, sso: true })
    expect(body.limits).toEqual({ tokens: 100000, seats: 25 })
  })

  it('checks live usage against the resolved limit', async () => {
    const { body } = await get('/devtools/api/entitle/default/check?subject=acct_1&key=tokens')
    expect(body).toMatchObject({ allowed: true, used: 600, remaining: 99400, limit: 100000, feature: 'tokens' })
  })

  it('falls back to the default plan for an unknown subject', async () => {
    const { body } = await get('/devtools/api/entitle/default/describe?subject=ghost')
    expect(body.plan).toBe('free')
    expect(body.limits).toEqual({ tokens: 1000, seats: 1 })
  })

  it('requires a subject for describe', async () => {
    const { status } = await get('/devtools/api/entitle/default/describe')
    expect(status).toBe(400)
  })
})
