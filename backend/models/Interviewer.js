/**
 * Interviewer Model
 * AI interviewer configurations
 */

const mongoose = require('mongoose');

const interviewerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Interviewer name is required'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  expertise_field: { 
    type: String,
    trim: true
  },
  avatar_url: {
    type: String,
    trim: true
  },
  personality_type: {
    type: String,
    enum: ['friendly', 'formal', 'challenging', 'supportive'],
    default: 'friendly'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Interviewer', interviewerSchema);
