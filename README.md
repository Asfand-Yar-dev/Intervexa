# Intervexa — AI-Powered Mock Interview System

An AI-powered web application that helps users practice interviews with real-time feedback on voice, body language, and answer quality.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TailwindCSS 4, Radix UI |
| Backend | Node.js, Express 5, MongoDB, Mongoose 9 |
| Auth | JWT + Google OAuth 2.0 |
| AI (Phase 5) | Python FastAPI microservice (planned) |

---

## Prerequisites

Make sure you have the following installed:

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **MongoDB** running locally or a [MongoDB Atlas](https://www.mongodb.com/atlas) connection string
- **pnpm** (for frontend) — Install with: `npm install -g pnpm`
- **Git** — [Download](https://git-scm.com/)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Set Up the Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
```

Now open `backend/.env` and fill in your values:

| Variable | What to put |
|----------|-------------|
| `MONGO_URI` | Your MongoDB connection string |
| `JWT_SECRET` | A random 64+ character string (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID (optional, for Google Sign-In) |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret (optional) |

Start the backend:

```bash
# Development mode (auto-restart on changes)
npm run dev

# Or production mode
npm start
```

The backend will start on **http://localhost:5000**. You should see:
```
🚀 Server running on port 5000
✅ MongoDB Connected
```

### 3. Set Up the Frontend

Open a **new terminal** and go back to the project root:

```bash
# Navigate to project root (not backend/)
cd ..

# Install frontend dependencies
pnpm install

# Create your environment file
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | What to put |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` (default, no change needed for local dev) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same Google Client ID as in backend `.env` (optional) |

Start the frontend:

```bash
pnpm dev
```

The frontend will start on **http://localhost:3000**.

### 4. Open the App

Open your browser and go to **http://localhost:3000**

---

## Project Structure

```
├── app/                    # Next.js pages (App Router)
├── components/             # React components (UI, auth, dashboard)
├── contexts/               # Auth context provider
├── hooks/                  # Custom React hooks
├── lib/                    # API client & utilities
├── public/                 # Static assets
├── backend/
│   ├── config/             # Database, logger, constants
│   ├── controllers/        # Route handlers
│   ├── middleware/          # Auth, validation, error handling
│   ├── models/             # Mongoose schemas (13 models)
│   ├── routes/             # API route definitions
│   ├── services/           # AI service integrations (placeholder)
│   └── server.js           # Express server entry point
└── Doc/                    # Architecture documentation
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Login with email/password |
| POST | `/api/users/google` | Google OAuth sign-in |
| GET | `/api/users/me` | Get current user profile |
| GET | `/api/users/stats` | Dashboard statistics |
| POST | `/api/interviews/start` | Start interview session |
| PUT | `/api/interviews/:id/end` | End interview session |
| GET | `/api/questions` | Get questions (filtered) |
| GET | `/api/questions/random` | Get random questions |
| POST | `/api/answers/submit` | Submit an answer |
| GET | `/api/results` | Get interview results |
| GET | `/health` | Health check |

---

## Environment Variables

### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | Google OAuth Client ID |

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret (64+ chars) |
| `JWT_EXPIRES_IN` | No | Token expiry (default: 24h) |
| `BCRYPT_SALT_ROUNDS` | No | Password hash cost (default: 12) |
| `CORS_ORIGIN` | No | Allowed origins (default: http://localhost:3000) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth Client Secret |

See `backend/.env.example` for the full list including Phase 5 (AI) and Phase 6 (Production) variables.

---

## Available Scripts

### Frontend

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (http://localhost:3000) |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start production server |
| `npm run start:prod` | Start in NODE_ENV=production |
| `npm test` | Run tests (setup needed) |

---

## License

This project is part of a Final Year Project (FYP).
