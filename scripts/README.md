# scripts/

Operator-runnable TypeScript scripts. Per `~/CLAUDE.md`'s "Use Prisma
— never make the founder paste raw SQL" rule: any data change
(`INSERT` / `UPDATE` / `UPSERT` against existing tables) goes through
a script in this directory using the existing Prisma client at
`@/lib/db/client`.

Run a script with:

```powershell
npx tsx scripts/<name>.ts
```

Idempotency rules every script in this directory must follow:
- Re-running with no arguments must be a no-op when state is
  already correct (use `findFirst` + conditional `update`, or
  `upsert` with the right unique constraint).
- Destructive flags (e.g., `--clean`, `--reset`) must touch ONLY
  rows the script itself owns. Never blanket-delete a table.

## Scripts

| Script | Purpose |
|---|---|
| `seed-avatar-eval-demo.ts` | Seeds ~30 sample `AvatarEvalRun` rows so `/admin/avatar-eval` and `/admin/avatar-eval/decision` render meaningful demo content. `--clean` removes only the demo-tagged rows. |
