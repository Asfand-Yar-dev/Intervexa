const express = require("express");
const Question = require("../models/Question");
const router = express.Router();

// Get questions
router.get("/", async (req, res) => {
  const questions = await Question.find();
  res.json(questions);
});

/*
router.post("/add", async (req, res) => {
  const { text, category, difficulty } = req.body;

  const question = new Question({
    text,
    category,
    difficulty
  });

  await question.save();
  res.json({ message: "Question added" });
});*/

router.post("/add", async (req, res) => {
  // 1. Read the data using the names coming from Postman
  const { questionText, category, difficulty } = req.body;

  const question = new Question({
    questionText, // Matches the Schema now
    category,     // Matches the Schema now
    difficulty    // Matches the Schema now
  });

  try {
    await question.save();
    res.json({ message: "Question added", question });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
