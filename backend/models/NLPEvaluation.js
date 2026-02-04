/**
 * NLP Evaluation Model
 * Stores natural language processing evaluation results
 */

const mongoose = require('mongoose');

const nlpSchema = new mongoose.Schema({
  answer_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Answer',
    required: [true, 'Answer ID is required']
  },
  relevance_score: {
    type: Number,
    min: 0,
    max: 100
  },
  relevance_feedback: {
    type: String,
    trim: true
  },
  fluency_score: {
    type: Number,
    min: 0,
    max: 100
  },
  fluency_feedback: {
    type: String,
    trim: true
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
  overall_score: {
    type: Number,
    min: 0,
    max: 100
  },
  overall_feedback: {
    type: String,
    trim: true
  },
  keywords_matched: [{
    type: String,
    trim: true
  }],
  improvement_suggestions: [{
    type: String,
    trim: true
  }]
}, { 
  timestamps: true 
});

nlpSchema.index({ answer_id: 1 });

module.exports = mongoose.model('NLPEvaluation', nlpSchema);