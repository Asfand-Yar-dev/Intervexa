const express = require("express");
const InterviewSession = require("../models/InterviewSession");
const router = express.Router();

// Start Interview
router.post("/start", async (req, res) => {
  const { user_id } = req.body;

  const session = new InterviewSession({
    user_id,
    start_time: new Date(),
    status: "ongoing"
  });

  await session.save();
  res.json({ message: "Interview started", session });
});

// Get user interview sessions
router.get("/user/:userId", async (req, res) => {
  const sessions = await InterviewSession.find({
    user_id: req.params.userId
  });

  res.json(sessions);
});

module.exports = router;
