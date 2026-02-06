# Intervexa

> An intelligent AI-powered mock interview platform that helps users practice and improve their interview skills using real-time analysis.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)

## 📋 Overview

Intervexa is a full-stack web application that provides:
- 🎯 AI-powered mock interviews with real-time feedback
- 📊 Comprehensive analysis of responses (NLP, facial, vocal)
- 📈 Progress tracking and performance history
- 🔐 Secure authentication (Email/Password & Google OAuth)
- 🌙 Modern UI with dark/light mode support

## 🏗️ Project Structure

```
AI-Web-Based-Mock-Interview-System/
├── app/                    # Next.js Frontend (App Router)
│   ├── dashboard/          # Dashboard pages
│   ├── interview/          # Interview session pages
│   ├── login/              # Authentication pages
│   └── ...
├── components/             # React UI Components
│   ├── ui/                 # Shadcn UI components
│   ├── auth/               # Auth components
│   ├── dashboard/          # Dashboard components
│   └── landing/            # Landing page components
├── backend/                # Express.js Backend API
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Express middleware
│   ├── models/             # MongoDB models
│   └── routes/             # API routes
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
└── public/                 # Static assets
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16 or higher
- **MongoDB** (local or Atlas)
- **pnpm** (recommended) or npm

### 1. Clone the Repository

```bash
git clone https://github.com/Asfand-Yar-dev/AI-Web-Based-Mock-Interview-System.git
cd AI-Web-Based-Mock-Interview-System
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your settings:
# - MONGO_URI=your_mongodb_connection_string
# - JWT_SECRET=your_secret_key
# - GOOGLE_CLIENT_ID=your_google_client_id

# Start development server
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
# From project root
cd ..

# Install dependencies
pnpm install
# or: npm install

# Start development server
pnpm dev
# or: npm run dev
```

Frontend will run on `http://localhost:3000`

## 🔧 Environment Variables

### Backend (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/ai_interview_system

# JWT
JWT_SECRET=your-super-secret-jwt-key-32chars
JWT_EXPIRES_IN=24h

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# CORS
CORS_ORIGIN=http://localhost:3000

# Security
BCRYPT_SALT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Login with email/password |
| POST | `/api/users/google` | Sign in with Google |
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/me` | Update profile |
| PUT | `/api/users/change-password` | Change password |
| GET | `/api/users/verify-token` | Verify JWT token |

### Interview Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interviews/start` | Start new session |
| GET | `/api/interviews/my-sessions` | Get user's sessions |
| PUT | `/api/interviews/:id/end` | End a session |

Full API documentation: See `backend/API_TESTING.md`

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI
- **Animations:** Framer Motion
- **State Management:** React Context + Hooks

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT + bcrypt
- **OAuth:** Google Auth Library
- **Validation:** express-validator
- **Security:** Helmet, CORS, Rate Limiting

## 📁 Key Files

| File | Description |
|------|-------------|
| `backend/server.js` | Express server entry point |
| `backend/controllers/authController.js` | Authentication logic |
| `backend/middleware/auth.js` | JWT verification |
| `backend/models/User.js` | User schema with bcrypt |
| `app/layout.tsx` | Next.js root layout |
| `app/page.tsx` | Landing page |
| `components/auth/auth-form.tsx` | Login/Signup form |

## 🧪 Testing

### Backend

```bash
cd backend

# Postman Collection
# Import backend/postman_collection.json into Postman

# Or use cURL
curl http://localhost:5000/health
```

### Frontend

```bash
pnpm dev
# Visit http://localhost:3000
```

## 📦 Scripts

### Backend

```bash
npm run dev      # Development with nodemon
npm start        # Production start
```

### Frontend

```bash
pnpm dev         # Development server
pnpm build       # Production build
pnpm start       # Start production server
pnpm lint        # Run ESLint
```

## 🔐 Security Features

- ✅ Password hashing (bcrypt)
- ✅ JWT authentication
- ✅ Google OAuth 2.0
- ✅ Input validation
- ✅ Rate limiting
- ✅ Security headers (Helmet)
- ✅ CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- **FYP Team** - AI Web-Based Mock Interview System

---

Made with ❤️ for better interview preparation
