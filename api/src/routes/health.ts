import { Router } from 'express'

export const healthRouter = Router()

// Liveness check: is the Express process up and serving? Deliberately does NOT
// query the database — a transient DB blip must not make the host (Railway,
// Slice 6) restart an otherwise-healthy web process. A DB-aware readiness probe,
// if ever needed, would be a separate /ready endpoint.
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})
