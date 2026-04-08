# Help Rehab Clinic — Full-Stack Website

Physiotherapy, neurological rehabilitation, and psychiatry clinic based in Jammu, J&K.  
**Stack:** Node.js · Express · PostgreSQL · Vanilla HTML/CSS/JS

---

## Project Structure

```
rehab-clinic-website/
├── frontend/
│   └── public/
│       ├── index.html      ← Public patient-facing website
│       ├── admin.html      ← Staff admin dashboard (JWT-protected)
│       ├── style.css       ← Main stylesheet
│       └── script.js       ← Frontend JavaScript
│
├── backend/
│   ├── server.js           ← Express app entry point
│   ├── db.js               ← PostgreSQL connection pool
│   ├── middleware/
│   │   └── auth.js         ← JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js         ← POST /api/auth/login, GET /api/auth/me
│   │   ├── inquiries.js    ← Contact form submissions
│   │   ├── appointments.js ← Appointment management
│   │   └── resources.js    ← Patients, doctors, services, dashboard
│   └── scripts/
│       └── setupDb.js      ← One-time database schema + seed
│
├── package.json
├── .env                    ← (create from .env.example, never commit)
├── .env.example
└── README.md
```

---

## Prerequisites

- **Node.js** v18+
- **PostgreSQL** v14+  
  Create a database: `CREATE DATABASE rehab_clinic;`

---

## Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — a long random string (run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — initial admin credentials

### 3. Initialize the database
```bash
npm run setup-db
```
This creates all tables, indexes, triggers, seeds initial services & doctors, and creates the default admin user.

### 4. Start the development server
```bash
npm run dev
```

Server starts at **http://localhost:5000**

---

## Key URLs

| URL | Description |
|-----|-------------|
| `http://localhost:5000/` | Patient-facing website |
| `http://localhost:5000/admin` | Admin dashboard (login required) |
| `http://localhost:5000/api/health` | API health check |
| `http://localhost:5000/api/services` | Public services list |
| `http://localhost:5000/api/auth/login` | Admin login endpoint |
| `http://localhost:5000/api/inquiries` | Contact form submissions |
| `http://localhost:5000/api/appointments` | Appointment management |

---

## API Overview

### Public endpoints (no auth)
- `GET  /api/health`
- `GET  /api/services`
- `GET  /api/doctors`
- `POST /api/inquiries` — contact form submission

### Authenticated endpoints (JWT Bearer token)
- `POST /api/auth/login`
- `GET  /api/auth/me`
- `GET  /api/inquiries` — list all inquiries
- `GET  /api/appointments`
- `POST /api/appointments`
- `GET  /api/patients`
- `GET  /api/dashboard/stats`

---

## Default Admin Credentials
Set in `.env` before running `npm run setup-db`:
- **Username:** `admin`
- **Password:** value of `ADMIN_PASSWORD` (default: `Admin@1234`)

> ⚠️ Change the password immediately after first login in production.

---

## Production Notes

- Set `CORS_ORIGIN` to your actual frontend domain
- Use a strong `JWT_SECRET`
- Run behind a reverse proxy (nginx/Caddy) with HTTPS
- Set `NODE_ENV=production`
