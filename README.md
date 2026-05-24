# Campus Carpool App

This is a **full-stack campus carpool matching app** I built to explore how real-world constraints (time, roles, geography) affect matching logic, beyond simple CRUD apps.

The goal was not just “build pages + APIs”, but to design something that feels **close to a real product**, with clear trade-offs and clean abstractions.

---

## What the app does

- Users can sign up as **drivers / passengers / both**
- Users set their **weekly commute schedule** (to campus / go home)
- The system **matches drivers and passengers** based on:
  - time window overlap
  - campus
  - role compatibility
  - **real geographic detour cost**
- Users can send **ride requests**, accept/reject them, and only see contact info after acceptance
- Users can edit their **home location on a map** (lat/lng), which directly affects matching

---

## Tech stack

### Backend

- Node.js + Express (TypeScript)
- PostgreSQL + Prisma
- Joi for validation
- Google Maps APIs (Directions / Distance Matrix)
- RESTful API design

### Frontend

- React + TypeScript (CRA)
- Material UI
- Google Maps JavaScript API (for location editing)

### Caching / Rate limiting

- Redis

### Engineering

- Provider abstraction for geo logic (mock vs real Google)
- Concurrency-limited matching to control API usage
- Idempotent endpoints for ride requests
- CI with automated tests

---

## Matching logic (high level)

Matching is done in stages:

1. **Pre-filter**
   - same campus
   - role compatibility
   - schedule overlap (with flexibility window)

2. **Geographic filtering**
   - compute:
     - `baseMins`: driver → campus
     - `viaMins`: driver → passenger → campus
     - `extraDetourMins = viaMins - baseMins`
   - drop matches where `extraDetourMins` exceeds the driver’s limit
   - results are sorted by:
     1. smallest detour
     2. smallest time difference

Geographic logic is implemented behind a **GeoProvider abstraction**, so the system can switch between:

- a mock provider (for tests / CI)
- a real Google Maps provider (for local demo / production)

---

## Why the GeoProvider abstraction

Instead of calling Google APIs directly inside controllers, all geo logic goes through a `GeoProvider` interface.

This makes it easy to:

- keep tests deterministic
- avoid calling Google APIs in CI
- swap implementations without touching matching logic

In local development:

```env
GEO_PROVIDER=google
```

---

## Authentication

The app uses **JWT-based auth** with short-lived access tokens and long-lived refresh tokens:

- **Access token** — 15 min, sent as `Authorization: Bearer <token>` on every request
- **Refresh token** — 7 days, stored in the database (revocable on logout), used to issue a new access token when the old one expires

All protected routes go through a single `authenticate` middleware (gateway pattern). The frontend handles the full token lifecycle transparently:

- axios request interceptor auto-attaches the Bearer token
- axios response interceptor catches 401s, silently refreshes, and retries the original request — concurrent requests during a refresh are queued and replayed once the new token arrives

Public routes (registration, user browsing) require no token.

---

## Service layer

Business logic was extracted from controllers into a dedicated `services/` layer:

| Service | Responsibility |
|---|---|
| `authService` | login, token issuance, refresh, logout, revocation |
| `userService` | user CRUD, password change |
| `scheduleService` | schedule entry management |
| `rideRequestService` | request creation, respond, cancel, inbox/outbox |
| `matchingService` | matching algorithm, geo filtering |

Controllers are now thin HTTP adapters: validate input → call service → return response.

---

## Redis: caching and rate limiting

Two problems motivated adding Redis to the matching layer:

1. **Google Maps API cost** — every geo-matching request calls the Distance Matrix API, which is metered. The same user querying the same parameters repeatedly shouldn't trigger repeated API calls.
2. **Abuse prevention** — without rate limiting, a user could spam the matching endpoint and run up the Maps API bill.

### Cache-aside (match results)

```
GET cache:match:{userId}:{dayOfWeek}:{timeField}:{timeValue}:{flexMin}:{role}
  → hit:  return JSON.parse(cached)          ← skip DB + Maps API entirely
  → miss: run matching logic → SET with EX 300  ← cache for 5 minutes
```

All parameters that affect the result are part of the key, so different queries never collide. TTL is 5 minutes — short enough that stale schedules are acceptable for a carpool app, long enough to absorb repeated queries.

If Redis is unreachable, the `GET` and `SET` calls are each wrapped in `try-catch`; the service computes and returns results normally.

### Fixed-window rate limiting (matching endpoints)

```
key = ratelimit:match:{userId}:{floor(now / 60000)}   ← one key per user per minute

INCR key          → returns new count (atomic, no lock needed — Redis is single-threaded)
if count == 1:
  EXPIRE key 60   → set TTL so the key cleans itself up
if count > 10:
  → 429 Too Many Requests
```

The middleware runs after `authenticate` so `req.user.id` is available. It also sets `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers on every response.

If Redis is unreachable the middleware catches the error, logs it, and calls `next()` — rate limiting degrades gracefully without blocking requests.

### Key design note

`INCR` and `EXPIRE` are two separate commands, not one atomic operation. If the process crashes between them the key leaks — but because the key encodes the minute timestamp, it becomes unreachable the next minute anyway. The worst case is one window's quota counting against the following window, which is acceptable for this use case.

---

## Deployment (EC2 + Docker)

The app ships as four Docker containers managed by `docker-compose`:

- **db** — PostgreSQL 16
- **redis** — Redis 7 (persistence disabled — caches and rate-limit counters are ephemeral by design)
- **backend** — Express API (runs `prisma migrate deploy` on start)
- **frontend** — React SPA served by nginx, which reverse-proxies `/api/*` to the backend

To deploy on a fresh EC2 instance:

```bash
# 1. Copy the project to EC2 (or git clone)
# 2. Set secrets in environment or a .env file
export JWT_ACCESS_SECRET=<strong-random-secret>
export JWT_REFRESH_SECRET=<strong-random-secret>
export GOOGLE_MAPS_API_KEY=<your-key>

# 3. Run the deploy script from project root
./scripts/deploy-ec2.sh
```

> **Google Maps**: the map feature requires a billing-enabled API key. For a demo without billing, set `GEO_PROVIDER=mock` to disable real geo calls.
