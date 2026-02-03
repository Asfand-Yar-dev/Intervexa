const mongoose = require("mongoose");

const facialSchema = new mongoose.Schema({
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewSession" },
  confidence_score_with_text: String,
  stress_score_with_text: String,
  engagement_score_with_text: String
}, { timestamps: true });

module.exports = mongoose.model("FacialAnalysis", facialSchema);