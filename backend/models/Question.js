/**
 * Question Model
 * Stores interview questions with categories and difficulty levels
 * 
 * ARCHITECTURE ALIGNMENT: Added skills, isAIGenerated, usageCount
 * per architecture document section 5.3
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
  // --- Architecture Doc Section 5.3: Missing Fields ---
  skills: [{
    type: String,
    trim: true
  }],
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // --- End Missing Fields ---
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
 * Indexes for efficient queries
 */
questionSchema.index({ category: 1, difficulty: 1 });
questionSchema.index({ isActive: 1 });
questionSchema.index({ skills: 1 });
questionSchema.index({ isAIGenerated: 1 });

module.exports = mongoose.model('Question', questionSchema);