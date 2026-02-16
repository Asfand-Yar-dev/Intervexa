/**
 * Vocal Analysis Model
 * Stores voice/speech analysis results
 * 
 * NOTE: Updated field names from snake_case to camelCase for
 * consistency with Answer, AnswerAnalysis, and InterviewQuestion models.
 */

const mongoose = require('mongoose');

const vocalSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: [true, 'Interview session ID is required']
  },
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  },
  clarityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  clarityFeedback: {
    type: String,
    trim: true
  },
  hesitationScore: {
    type: Number,
    min: 0,
    max: 100
  },
  hesitationFeedback: {
    type: String,
    trim: true
  },
  toneScore: {
    type: Number,
    min: 0,
    max: 100
  },
  toneFeedback: {
    type: String,
    trim: true
  },
  paceWpm: {
    type: Number, // words per minute
    min: 0
  },
  fillerWordsCount: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

vocalSchema.index({ interviewId: 1 });

module.exports = mongoose.model('VocalAnalysis', vocalSchema);