const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  question_id: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewSession" },
  answer_text: String
}, { timestamps: true });

module.exports = mongoose.model("Answer", answerSchema);