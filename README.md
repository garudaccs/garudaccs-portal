# Garuda CCS — Command & Control Station

Vanilla **HTML/CSS/JS** frontend with a **Neon (Postgres) backend** via Vercel Serverless Functions.

## Features
- Authentication (email/password) with roles: **Admin / Team / Stakeholder**
- RBAC data views
  - **Admin**: all scopes (`adhiratha`, `personal`, `minervainfo`)
  - **Stakeholder**: `adhiratha` only
  - **Team**: `adhiratha` only (configurable later)
- Token usage tracking
  - Summary charts: tokens by model, tokens by agent
  - Raw table view (last N days)
- Agent activity monitor (status + last activity)
- Task tracker
  - `TRACKER.md` is a seed file
  - Sync endpoint upserts into NeonDB
  - Status updates persist in NeonDB

## Tech
- Frontend: `/public` (no framework)
- Backend: `/api` (Vercel Serverless Functions, Node 22)
- Database: Neon (Postgres)

## Environment variables (Vercel)
- `DATABASE_URL` — Neon connection string
- `JWT_SECRET` — random long secret for JWT signing
- `BOOTSTRAP_SECRET` — one-time bootstrap secret to create first Admin user

## Database setup
1. Create Neon project + database
2. Run `schema.sql`
3. Deploy to Vercel and set the env vars
4. Open the site → use “First-time setup (Admin bootstrap)” to create Admin login

## Local dev
```bash
npm i
vercel dev
```
