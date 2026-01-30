# AI Interview System - Backend Service

This repository houses the **Backend API** for the AI Interview System. It is built with Node.js and Express, designed to handle interview sessions, candidate data, and AI analysis integration.

## 📋 Prerequisites

Before running the server, ensure you have the following installed:
*   **Node.js** (v16 or higher)
*   **MongoDB** (running locally or via Atlas)

## ⚙️ Setup & Installation

Follow these steps to get the backend running locally:

### 1. Application Directory
All backend logic is contained within the `backend/` folder.
```bash
cd backend
```

### 2. Install Dependencies
Install the required packages listed in `package.json`:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file inside the `backend/` directory:
```bash
touch .env  # or manually create the file
```
Add the following configuration to your `.env` file:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai_interview_system
NODE_ENV=development
```

## 🚀 Running the Server

**For Development (Auto-restart on save):**
```bash
npm run dev
```

**For Production:**
```bash
npm start
```

## 📦 Key Dependencies

This project relies on the following core libraries:

*   **express**: Web framework for building the API.
*   **mongoose**: MongoDB ODM for data modeling.
*   **dotenv**: Manage environment variables.
*   **cors**: Enable Cross-Origin Resource Sharing for frontend integration.
*   **winston**: Professional logging library.
