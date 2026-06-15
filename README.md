# aimon

A browser-based aim trainer with a shared online leaderboard. Learning project.

See [SPEC.md](./SPEC.md) for architecture and scope, and [CLAUDE.md](./CLAUDE.md)

## Status
Slice 1 done — monorepo scaffolded. `web/` (Vite+TS) and `api/` (Node+TS+Express)
dev servers start clean. No gameplay or backend logic yet (Slices 2+).

```bash
cd web && npm install && npm run dev   # frontend → localhost:5173
cd api && npm install && npm run dev   # backend  → localhost:3000
```
