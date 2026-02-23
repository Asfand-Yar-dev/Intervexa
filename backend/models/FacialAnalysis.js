/**
 * Facial Analysis Model
 * Stores facial expression analysis results
 * 
 * NOTE: Updated field names from snake_case to camelCase for
 * consistency with Answer, AnswerAnalysis, and InterviewQuestion models.
 */

const mongoose = require('mongoose');

const facialSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: [true, 'Interview session ID is required']
  },
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100
  },
  confidenceFeedback: {
    type: String,
    trim: true
  },
  stressScore: {
    type: Number,
    min: 0,
    max: 100
  },
  stressFeedback: {
    type: String,
    trim: true
  },
  engagementScore: {
    type: Number,
    min: 0,
    max: 100
  },
  engagementFeedback: {
    type: String,
    trim: true
  },
  emotionsDetected: [{
    emotion: String,
    percentage: Number,
    timestamp: Date
  }]
}, {
  timestamps: true
});

facialSchema.index({ interviewId: 1 });

module.exports = mongoose.model('FacialAnalysis', facialSchema);