# Campus Carpool App

A full-stack **TypeScript** web app for campus carpooling.  
Users can **sign up / log in**, provide **home area (geo info)** + **commuting schedule**, discover **compatible matches**, and send **carpool connection requests**.

> Chatroom is not implemented in this version.

---

## Tech Stack

- **Frontend:** React + TypeScript + Material UI + Axios
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL + Prisma
- **Security:** bcrypt (12 rounds), Joi validation

---

## Core Features

- **Authentication**
  - Secure password hashing (bcrypt)
  - Login / session or token-based auth (protected endpoints)

- **User Profiles**
  - User info (campus, role: DRIVER/PASSENGER/BOTH)
  - Home location / area (geo info)
  - Weekly commuting schedule (ScheduleEntry)

- **Matching**
  - Match users by **home proximity** + **schedule overlap**
  - Browse & filter candidates

- **Connection Requests**
  - Send / receive carpool requests
  - Track status (e.g., PENDING → ACCEPTED / DECLINED)

- **Admin-style User Management**
  - CRUD users
  - Soft delete (`isActive=false`) and permanent delete

---

## Project Structure

├── carpool/ # Backend (Express.js + TypeScript)
├── frontend/ # Frontend (React + TypeScript)
├── prisma/ # Prisma schema + migrations
└── README.md
