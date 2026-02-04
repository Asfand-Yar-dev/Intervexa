/**
 * Vocal Analysis Model
 * Stores voice/speech analysis results
 */

const mongoose = require('mongoose');

const vocalSchema = new mongoose.Schema({
  session_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'InterviewSession',
    required: [true, 'Session ID is required']
  },
  answer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  },
  clarity_score: {
    type: Number,
    min: 0,
    max: 100
  },
  clarity_feedback: {
    type: String,
    trim: true
  },
  hesitation_score: {
    type: Number,
    min: 0,
    max: 100
  },
  hesitation_feedback: {
    type: String,
    trim: true
  },
  tone_score: {
    type: Number,
    min: 0,
    max: 100
  },
  tone_feedback: {
    type: String,
    trim: true
  },
  pace_wpm: {
    type: Number, // words per minute
    min: 0
  },
  filler_words_count: {
    type: Number,
    min: 0,
    default: 0
  }
}, { 
  timestamps: true 
});

vocalSchema.index({ session_id: 1 });

module.exports = mongoose.model('VocalAnalysis', vocalSchema);