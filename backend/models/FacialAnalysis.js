/**
 * Facial Analysis Model
 * Stores facial expression analysis results
 */

const mongoose = require('mongoose');

const facialSchema = new mongoose.Schema({
  session_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'InterviewSession',
    required: [true, 'Session ID is required']
  },
  answer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  },
  confidence_score: {
    type: Number,
    min: 0,
    max: 100
  },
  confidence_feedback: {
    type: String,
    trim: true
  },
  stress_score: {
    type: Number,
    min: 0,
    max: 100
  },
  stress_feedback: {
    type: String,
    trim: true
  },
  engagement_score: {
    type: Number,
    min: 0,
    max: 100
  },
  engagement_feedback: {
    type: String,
    trim: true
  },
  emotions_detected: [{
    emotion: String,
    percentage: Number,
    timestamp: Date
  }]
}, { 
  timestamps: true 
});

facialSchema.index({ session_id: 1 });

module.exports = mongoose.model('FacialAnalysis', facialSchema);