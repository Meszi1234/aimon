import express from 'express'

const app = express()
const port = Number(process.env.PORT) || 3000

// Slice 1 scaffold route — proves the server boots and responds.
// The real /health, pg pool, and route modules arrive in Slice 4.
app.get('/', (_req, res) => {
  res.json({ status: 'scaffold ok' })
})

app.listen(port, () => {
  console.log(`api listening on :${port}`)
})
