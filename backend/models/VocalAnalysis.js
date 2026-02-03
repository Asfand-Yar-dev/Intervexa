const mongoose = require("mongoose");

const vocalSchema = new mongoose.Schema({
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewSession" },
  clarity_score_with_text: String,
  hesitation_score_with_text: String,
  tone_score_with_text: String
}, { timestamps: true });

module.exports = mongoose.model("VocalAnalysis", vocalSchema);