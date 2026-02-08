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
