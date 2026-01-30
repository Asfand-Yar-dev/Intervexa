const mongoose = require("mongoose");

const selectionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  interviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Interviewer" },
  selected_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UserInterviewerSelection", selectionSchema);
