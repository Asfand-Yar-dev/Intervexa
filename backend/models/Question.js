/*const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewSession" },
  question_text: String
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);*/

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  // 1. Rename this to match what you usually send, or keep it consistent
  questionText: { 
    type: String, 
    required: true 
  },
  // 2. Add these missing fields so they don't get ignored
  category: { 
    type: String,
    required: true
  },
  difficulty: { 
    type: String,
    default: "Medium"
  },
  // Optional: Keep session_id if questions belong to specific sessions
  session_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "InterviewSession" 
  }
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);