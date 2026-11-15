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

On every start the container applies migrations (`prisma migrate deploy`) and seeds these users:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | value of `ADMIN_PASSWORD` (default `admin123`) | admin |
| `ana` | `ana12345` | user |
| `marko` | `marko12345` | user |

The admin role is given to the account whose username equals `ADMIN_USERNAME`. The `users` table only has `id`, `username` and `password_hash`.

## Deploying to Render

Option A, Blueprint: New → Blueprint → select this repo. `render.yaml` creates the database and the Docker web service, and asks for `ADMIN_PASSWORD`.

Option B, manual:
1. Create a PostgreSQL instance.
2. Create a Web Service from this repo with the **Docker** runtime.
3. Set the env vars from `.env.example`. For `DATABASE_URL`, use the database's *Internal Database URL*. Render sets `PORT` itself.

## How to test

### 1. Stored XSS
1. Log in as `ana`, leave **Ranjivost uključena** checked.
2. Click a preset (e.g. *JavaScript dijalog* or *Krađa sesije (JWT)*) and save the note. The payload runs: an alert appears, or the alert shows the JWT from `localStorage`.
3. Uncheck the switch. The same note from the database is now shown as plain text.

Each note is rendered once per page load: saving or deleting another note does not re-run older payloads. Reloading the page runs every stored payload once, which is what makes it *stored* XSS. The admin table in section 2 always shows notes as plain text.

### 2. Broken access control
1. Log in as `ana`. Step 1 shows the token, colored by part.
2. Click **Postavi "role": "admin"**. The payload is changed and re-encoded. Header and signature stay the same.
3. With the switch checked, click **Pošalji token**. You get `200` and every user's password hash and private notes.
4. Uncheck the switch and send again. You get `401 Neispravan token: invalid signature`.
5. Click **Resetiraj** and send the unmodified token. It returns `403` in both modes, because `ana` really is a `user`.

## Project layout

```
src/
  server.js              starts the HTTP server
  app.js                 express app, routes, error handler
  config.js              env vars
  db.js                  Prisma client
  auth.js                JWT signing, requireAuth, requireAdmin (the vulnerable switch)
  routes/
    auth.routes.js       register, login, me
    notes.routes.js      CRUD for the logged-in user's notes
    admin.routes.js      admin-only list of all users and notes
prisma/
  schema.prisma          User, Note
  migrations/            SQL migrations
  seed.js                demo users
public/                  static frontend (no build step)
```
