/**
 * Interview Session Model
 * Tracks interview sessions for users
 */

const mongoose = require('mongoose');
const { SESSION_STATUS } = require('../config/constants');

const interviewSessionSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'User ID is required']
  },
  session_type: { 
    type: String,
    trim: true,
    default: 'general'
  },
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.PENDING
  },
  started_at: { 
    type: Date 
  },
  ended_at: { 
    type: Date 
  },
  total_questions: {
    type: Number,
    default: 0
  },
  answered_questions: {
    type: Number,
    default: 0
  },
  overall_score: {
    type: Number,
    min: 0,
    max: 100
  }
}, { 
  timestamps: true 
});

/**
 * Calculate session duration in minutes
 */
interviewSessionSchema.virtual('duration').get(function() {
  if (this.started_at && this.ended_at) {
    return Math.round((this.ended_at - this.started_at) / (1000 * 60));
  }
  return null;
});

/**
 * Include virtuals when converting to JSON
 */
interviewSessionSchema.set('toJSON', { virtuals: true });
interviewSessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);