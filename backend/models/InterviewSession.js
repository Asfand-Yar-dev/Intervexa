const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  session_type: String,
  started_at: Date,
  ended_at: Date
}, { timestamps: true });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);