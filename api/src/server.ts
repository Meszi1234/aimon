import express from 'express'
import { healthRouter } from './routes/health.js'

const app = express()
const port = Number(process.env.PORT) || 3000

// Seams for later slices, left intentionally empty for now:
//   - express.json() body parsing arrives in Slice 5 with POST /scores
//   - CORS arrives in Slice 5/6, when the browser first calls the API
app.use(healthRouter)

app.listen(port, () => {
  console.log(`api listening on :${port}`)
})
