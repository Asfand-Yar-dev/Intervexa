/**
 * Answer Model
 * Stores user answers to interview questions
 */

const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'User ID is required']
  },
  question_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Question',
    required: [true, 'Question ID is required']
  },
  session_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'InterviewSession',
    required: [true, 'Session ID is required']
  },
  answer_text: { 
    type: String,
    required: [true, 'Answer text is required'],
    trim: true
  },
  audio_url: {
    type: String,
    trim: true
  },
  video_url: {
    type: String,
    trim: true
  },
  evaluation_score: {
    type: Number,
    min: 0,
    max: 100
  },
  feedback: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

/**
 * Index for efficient queries
 */
answerSchema.index({ user_id: 1, session_id: 1 });
answerSchema.index({ question_id: 1 });

module.exports = mongoose.model('Answer', answerSchema);