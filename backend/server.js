require('dotenv').config(); // Load env vars first
const logger = require("./config/logger");
const express = require("express");
const cors = require("cors"); // <--- ADDED: Import CORS
const connectDB = require("./config/db");

const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors()); // <--- ADDED: Allows Frontend to talk to Backend
app.use(express.json()); // Allows reading JSON body

// 1. Home Route (Test)
app.get("/", (req, res) => {
  res.send("Backend Running");
});

// 2. API Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/interviews", require("./routes/interviewRoutes"));
app.use("/api/questions", require("./routes/questionRoutes"));
app.use("/api/answers", require("./routes/answerRoutes"));

// 3. Global Error Handler (Safety Net) <--- ADDED
// This catches any errors from the routes above so the server doesn't crash
//Error Handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Server Error", 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});