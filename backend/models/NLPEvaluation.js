const mongoose = require("mongoose");

const nlpSchema = new mongoose.Schema({
  answer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Answer" },
  relevance_score_with_text: String,
  fluency_score_with_text: String,
  clarity_score_with_text: String,
  feedback_score_with_text: String
}, { timestamps: true });

module.exports = mongoose.model("NLPEvaluation", nlpSchema);