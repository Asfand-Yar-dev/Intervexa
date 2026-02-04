/**
 * Question Model
 * Stores interview questions with categories and difficulty levels
 */

const mongoose = require('mongoose');
const { DIFFICULTY_LEVELS } = require('../config/constants');

const questionSchema = new mongoose.Schema({
  questionText: { 
    type: String, 
    required: [true, 'Question text is required'],
    trim: true,
    minlength: [10, 'Question must be at least 10 characters']
  },
  category: { 
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  difficulty: { 
    type: String,
    enum: {
      values: Object.values(DIFFICULTY_LEVELS),
      message: 'Difficulty must be Easy, Medium, or Hard'
    },
    default: DIFFICULTY_LEVELS.MEDIUM
  },
  session_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'InterviewSession'
  },
  expectedAnswer: {
    type: String,
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  timeLimit: {
    type: Number,
    default: 120, // seconds
    min: 30,
    max: 600
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

/**
 * Index for efficient category-based queries
 */
questionSchema.index({ category: 1, difficulty: 1 });
questionSchema.index({ isActive: 1 });

module.exports = mongoose.model('Question', questionSchema);