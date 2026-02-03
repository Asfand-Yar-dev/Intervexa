const express = require("express");
const Answer = require("../models/Answer");
const router = express.Router();

// Submit Answer
router.post("/submit", async (req, res) => {
  const { user_id, question_id, session_id, answer_text } = req.body;

  const answer = new Answer({
    user_id,
    question_id,
    session_id,
    answer_text,
    submitted_at: new Date()
  });

  await answer.save();

  // AI modules -> Later
  res.json({ message: "Answer submitted", answer });
});

module.exports = router;
