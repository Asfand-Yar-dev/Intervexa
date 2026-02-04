/**
 * User Interviewer Selection Model
 * Tracks which interviewers users have selected
 */

const mongoose = require('mongoose');

const selectionSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'User ID is required']
  },
  interviewer_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Interviewer',
    required: [true, 'Interviewer ID is required']
  },
  is_favorite: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

/**
 * Compound unique index to prevent duplicate selections
 */
selectionSchema.index({ user_id: 1, interviewer_id: 1 }, { unique: true });

module.exports = mongoose.model('UserInterviewerSelection', selectionSchema);
