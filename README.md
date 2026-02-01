# Campus Carpool App

A full-stack TypeScript application for managing campus carpooling with React frontend and Express.js backend.

## Project Structure

```
├── carpool/          # Backend (Express.js + TypeScript)
├── frontend/         # Frontend (React + TypeScript)
├── prisma/          # Database schema and migrations
└── README.md
```

## Quick Start

1. **Install all dependencies:**

   ```bash
   npm run install:all
   ```

2. **Set up environment:**

   ```bash
   cp .env.example .env
   # Update .env with your database URL
   ```

3. **Set up database:**

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Start both backend and frontend:**
   ```bash
   npm run dev:all
   ```

The backend will run on `http://localhost:3000` and the frontend on `http://localhost:3001`.

## Frontend Features

- **Home Page**: Overview and system status
- **User List**: Browse and filter campus carpool users
- **User Profile**: Detailed user information and schedules
- **Create User**: Registration form with validation
- **Responsive Design**: Material-UI components
- **Real-time API Integration**: Axios-based API calls

## Backend API

### Available Scripts

- `npm run dev` - Start backend development server
- `npm run frontend:dev` - Start frontend development server
- `npm run dev:all` - Start both backend and frontend
- `npm run build` - Build backend TypeScript
- `npm run frontend:build` - Build frontend for production

## Setup Details

### Backend Setup

1. Install backend dependencies:

   ```bash
   cd carpool && npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Install frontend dependencies:

   ```bash
   cd frontend && npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```

## API Documentation

### User Management Endpoints

#### Create User

- **POST** `/api/users`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "photoUrl": "https://example.com/photo.jpg",
    "contactType": "EMAIL",
    "contactValue": "john@example.com",
    "campus": "Main Campus",
    "homeArea": "Downtown",
    "role": "BOTH",
    "timeZone": "America/Vancouver"
  }
  ```

#### Get All Users

- **GET** `/api/users`
- **Query Parameters:**
  - `campus` (optional): Filter by campus
  - `homeArea` (optional): Filter by home area
  - `role` (optional): Filter by role (DRIVER/PASSENGER/BOTH)
  - `isActive` (optional): Filter by active status
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)

#### Get User by ID

- **GET** `/api/users/:id`

#### Update User

- **PUT** `/api/users/:id`
- **Body:** (all fields optional)
  ```json
  {
    "name": "Updated Name",
    "photoUrl": "https://example.com/new-photo.jpg",
    "contactType": "PHONE",
    "contactValue": "+1234567890",
    "campus": "North Campus",
    "homeArea": "Suburb",
    "role": "DRIVER",
    "timeZone": "America/Toronto",
    "isActive": true
  }
  ```

#### Change Password

- **PATCH** `/api/users/:id/password`
- **Body:**
  ```json
  {
    "currentPassword": "oldPassword",
    "newPassword": "newPassword123"
  }
  ```

#### Soft Delete User

- **DELETE** `/api/users/:id`
- Deactivates user (sets `isActive` to false)

#### Permanently Delete User

- **DELETE** `/api/users/:id/permanent`
- Permanently removes user from database

## Response Format

All API responses follow this structure:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": ["Optional array of detailed errors"]
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## Database Schema

The application uses Prisma with PostgreSQL. Key models:

- **User**: Core user information with authentication
- **ScheduleEntry**: User's weekly schedule for campus commuting
- **ConnectionRequest**: Carpool connection requests between users

## Security Features

- Passwords are hashed using bcrypt with 12 salt rounds
- Input validation using Joi schemas
- SQL injection protection via Prisma ORM
- Soft delete for user records (preserves data integrity)
