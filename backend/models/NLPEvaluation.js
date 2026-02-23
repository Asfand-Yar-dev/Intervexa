/**
 * NLP Evaluation Model
 * Stores natural language processing evaluation results
 * 
 * NOTE: Updated field names from snake_case to camelCase for
 * consistency with Answer, AnswerAnalysis, and InterviewQuestion models.
 */

const mongoose = require('mongoose');

const nlpSchema = new mongoose.Schema({
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer',
    required: [true, 'Answer ID is required']
  },
  relevanceScore: {
    type: Number,
    min: 0,
    max: 100
  },
  relevanceFeedback: {
    type: String,
    trim: true
  },
  fluencyScore: {
    type: Number,
    min: 0,
    max: 100
  },
  fluencyFeedback: {
    type: String,
    trim: true
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
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  overallFeedback: {
    type: String,
    trim: true
  },
  keywordsMatched: [{
    type: String,
    trim: true
  }],
  improvementSuggestions: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

nlpSchema.index({ answerId: 1 });

module.exports = mongoose.model('NLPEvaluation', nlpSchema);