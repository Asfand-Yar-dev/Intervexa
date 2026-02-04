# API Testing Guide

This document provides sample requests and responses for testing the AI Interview System API.

## Base URL
```
http://localhost:5000
```

## Quick Reference

| Method | Endpoint                    | Auth Required | Description              |
|--------|----------------------------|---------------|--------------------------|
| GET    | /                          | No            | Server status            |
| GET    | /health                    | No            | Health check             |
| POST   | /api/users/register        | No            | Register new user        |
| POST   | /api/users/login           | No            | Login with email/password|
| POST   | /api/users/google          | No            | Sign in with Google      |
| GET    | /api/users/me              | Yes           | Get profile              |
| PUT    | /api/users/me              | Yes           | Update profile           |
| PUT    | /api/users/change-password | Yes           | Change password          |
| GET    | /api/users/verify-token    | Yes           | Verify token validity    |

---

## 1. REGISTER NEW USER

### Request
```http
POST /api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Registration successful! Welcome to AI Interview System.",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "John Doe",
      "email": "john@example.com",
      "user_role": "user",
      "isActive": true,
      "createdAt": "2026-02-04T06:00:00.000Z",
      "updatedAt": "2026-02-04T06:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error: Duplicate Email (409 Conflict)
```json
{
  "success": false,
  "message": "An account with this email already exists. Please use a different email or login."
}
```

### Error: Validation Failed (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

### cURL Example
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

## 2. LOGIN

### Request
```http
POST /api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful! Welcome back.",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "John Doe",
      "email": "john@example.com",
      "user_role": "user",
      "isActive": true,
      "lastLogin": "2026-02-04T06:10:00.000Z",
      "createdAt": "2026-02-04T06:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error: Invalid Credentials (401 Unauthorized)
```json
{
  "success": false,
  "message": "Invalid email or password. Please check your credentials."
}
```

### cURL Example
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

## 3. GOOGLE SIGN-IN (OAuth 2.0)

Google Sign-In allows users to authenticate using their Google account.

### How It Works

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Google    │    │   Backend   │    │   Database  │
│  (React)    │    │   OAuth     │    │   (Node.js) │    │  (MongoDB)  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. User clicks   │                  │                  │
       │    "Sign in      │                  │                  │
       │    with Google"  │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │ 2. Google shows  │                  │                  │
       │    account picker│                  │                  │
       │<─────────────────│                  │                  │
       │                  │                  │                  │
       │ 3. User selects  │                  │                  │
       │    Google account│                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │ 4. Google returns│                  │                  │
       │    ID Token      │                  │                  │
       │<─────────────────│                  │                  │
       │                  │                  │                  │
       │ 5. Frontend sends ID Token          │                  │
       │────────────────────────────────────>│                  │
       │                  │                  │                  │
       │                  │ 6. Backend       │                  │
       │                  │    verifies token│                  │
       │                  │<─────────────────│                  │
       │                  │                  │                  │
       │                  │ 7. Token valid   │                  │
       │                  │─────────────────>│                  │
       │                  │                  │                  │
       │                  │                  │ 8. Find/Create   │
       │                  │                  │    user          │
       │                  │                  │─────────────────>│
       │                  │                  │                  │
       │                  │                  │ 9. User data     │
       │                  │                  │<─────────────────│
       │                  │                  │                  │
       │ 10. Backend returns our JWT + user  │                  │
       │<────────────────────────────────────│                  │
       │                  │                  │                  │
```

### Request
```http
POST /api/users/google
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6..."
}
```

### Success Response - Existing User (200 OK)
```json
{
  "success": true,
  "message": "Google sign-in successful! Welcome back.",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "John Doe",
      "email": "john@gmail.com",
      "user_role": "user",
      "authProvider": "google",
      "googleId": "109876543210987654321",
      "profilePicture": "https://lh3.googleusercontent.com/a/...",
      "isEmailVerified": true,
      "isActive": true,
      "lastLogin": "2026-02-04T06:15:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewUser": false,
    "authProvider": "google"
  }
}
```

### Success Response - New User (201 Created)
```json
{
  "success": true,
  "message": "Account created successfully with Google! Welcome to AI Interview System.",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "John Doe",
      "email": "john@gmail.com",
      "user_role": "user",
      "authProvider": "google",
      "googleId": "109876543210987654321",
      "profilePicture": "https://lh3.googleusercontent.com/a/...",
      "isEmailVerified": true,
      "isActive": true,
      "createdAt": "2026-02-04T06:15:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewUser": true,
    "authProvider": "google"
  }
}
```

### Error: Missing Token (400 Bad Request)
```json
{
  "success": false,
  "message": "Google ID token is required. Please provide the token from Google Sign-In."
}
```

### Error: Invalid Token (401 Unauthorized)
```json
{
  "success": false,
  "message": "Invalid or expired Google token. Please try signing in again."
}
```

### Error: Deactivated Account (401 Unauthorized)
```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact support."
}
```

### Testing with cURL (Manual Token)

**Note:** You cannot easily test Google Sign-In with cURL because you need a valid ID token from Google. Use the browser-based testing method below or Postman with a real token.

```bash
# This requires a real Google ID token (obtained from frontend)
curl -X POST http://localhost:5000/api/users/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_GOOGLE_ID_TOKEN_HERE"
  }'
```

---

## Frontend Integration Guide (Google Sign-In)

### Step 1: Install Package
```bash
npm install @react-oauth/google
```

### Step 2: Get Google Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Go to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**
5. Application type: **Web application**
6. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
7. Copy the **Client ID**

### Step 3: Add to Environment
```env
# .env (Frontend)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# .env (Backend)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Step 4: Frontend Implementation (React)

```jsx
// App.jsx or main.jsx
import { GoogleOAuthProvider } from '@react-oauth/google';

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <YourApp />
    </GoogleOAuthProvider>
  );
}
```

```jsx
// LoginPage.jsx
import { GoogleLogin } from '@react-oauth/google';

function LoginPage() {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Send the ID token to your backend
      const response = await fetch('http://localhost:5000/api/users/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: credentialResponse.credential
        })
      });

      const data = await response.json();

      if (data.success) {
        // Save the JWT token (e.g., in localStorage)
        localStorage.setItem('token', data.data.token);
        
        // Save user info
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // Redirect to dashboard or home
        if (data.data.isNewUser) {
          console.log('Welcome! New account created with Google.');
        } else {
          console.log('Welcome back!');
        }
        
        // Navigate to protected route
        window.location.href = '/dashboard';
      } else {
        console.error('Login failed:', data.message);
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  };

  return (
    <div className="login-page">
      <h1>Sign In</h1>
      
      {/* Google Sign-In Button */}
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => {
          console.log('Google Sign-In was cancelled or failed');
        }}
        useOneTap
        theme="outline"
        size="large"
        text="signin_with"
        shape="rectangular"
      />
      
      {/* Or traditional email/password form */}
      <div className="divider">OR</div>
      <form>
        {/* Email/password fields */}
      </form>
    </div>
  );
}

export default LoginPage;
```

---

## 4. GET CURRENT USER PROFILE

### Request
```http
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Doe",
    "email": "john@example.com",
    "user_role": "user",
    "isActive": true,
    "lastLogin": "2026-02-04T06:10:00.000Z",
    "createdAt": "2026-02-04T06:00:00.000Z"
  }
}
```

### Error: No Token (401 Unauthorized)
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### Error: Invalid Token (401 Unauthorized)
```json
{
  "success": false,
  "message": "Invalid token."
}
```

### cURL Example
```bash
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## 4. UPDATE PROFILE

### Request
```http
PUT /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "John Smith"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "name": "John Smith",
    "email": "john@example.com",
    "user_role": "user"
  }
}
```

### cURL Example
```bash
curl -X PUT http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name": "John Smith"}'
```

---

## 5. CHANGE PASSWORD

### Request
```http
PUT /api/users/change-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Password changed successfully. Please use your new password for future logins."
}
```

### Error: Wrong Current Password (401 Unauthorized)
```json
{
  "success": false,
  "message": "Current password is incorrect. Please try again."
}
```

### cURL Example
```bash
curl -X PUT http://localhost:5000/api/users/change-password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword456"
  }'
```

---

## 6. VERIFY TOKEN

### Request
```http
GET /api/users/verify-token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Token is valid.",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "John Doe",
      "email": "john@example.com",
      "user_role": "user"
    }
  }
}
```

### Error: Token Expired (401 Unauthorized)
```json
{
  "success": false,
  "message": "Token has expired. Please login again."
}
```

### cURL Example
```bash
curl -X GET http://localhost:5000/api/users/verify-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## Response Format Standard

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Descriptive success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Descriptive error message",
  "errors": [ ... ]  // Optional: validation errors
}
```

---

## HTTP Status Codes

| Code | Meaning                          |
|------|----------------------------------|
| 200  | OK - Request successful          |
| 201  | Created - Resource created       |
| 400  | Bad Request - Validation failed  |
| 401  | Unauthorized - Auth required     |
| 403  | Forbidden - Access denied        |
| 404  | Not Found - Resource not found   |
| 409  | Conflict - Duplicate resource    |
| 500  | Internal Server Error            |

---

## User Roles

The system supports three user roles:

| Role         | Description                                |
|--------------|-------------------------------------------|
| `user`       | Default role for registered users          |
| `admin`      | Administrative access                      |
| `interviewer`| AI interviewer profile                     |

---

## Testing with Postman

1. Import `postman_collection.json` into Postman
2. Set the `baseUrl` variable to `http://localhost:5000`
3. Register a new user or login
4. Copy the token from the response
5. Set the `token` variable with your JWT token
6. All protected routes will automatically use the token

---

## Common Issues

### "Access denied. No token provided."
- You forgot to add the Authorization header
- Header format: `Authorization: Bearer <your_token>`

### "Invalid token."
- Token is malformed or tampered with
- Try logging in again to get a fresh token

### "Token has expired."
- Tokens expire after 24 hours
- Login again to get a new token

### "An account with this email already exists."
- Email is already registered
- Use a different email or login instead

### "MongoDB Connection Failed"
- MongoDB is not running
- Start MongoDB: `mongod` or check MongoDB Atlas connection string

