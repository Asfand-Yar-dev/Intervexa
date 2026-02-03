const mongoose = require("mongoose");

const interviewerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  expertise_field: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Interviewer", interviewerSchema);
