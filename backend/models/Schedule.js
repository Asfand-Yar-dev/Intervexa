const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  interviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Interviewer" },
  date_time: { type: Date },
  status: { type: String, default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Schedule", scheduleSchema);
