# Web vulnerabilities demo

A small Express + Prisma + Postgres app that shows two vulnerabilities. Each one has an on/off switch in the UI:

1. **Stored XSS**: notes are saved as typed and rendered with `innerHTML` (vulnerable) or `textContent` (safe).
2. **Broken access control**: `GET /api/admin/users` reads the role from the JWT with `jwt.decode` (vulnerable, signature not checked) or `jwt.verify` (safe).

## Running locally

Requirements: Docker and [Task](https://taskfile.dev) (on Arch: `pacman -S go-task`, binary is `go-task`).

```bash
task up      # creates .env from .env.example if missing, builds and starts app + db
task logs    # follow app logs
task down    # stop
task reset   # stop and wipe the database
```

Without Task, run `cp .env.example .env` (and set `JWT_SECRET`), then `docker compose up --build`.

Open http://localhost:3000.

On every start the container applies migrations (`prisma migrate deploy`) and seeds three users.

The admin role is given to the account whose username equals `ADMIN_USERNAME`. The `users` table only has `id`, `username` and `password_hash`.
