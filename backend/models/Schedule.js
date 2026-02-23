/**
 * Schedule Model
 * Interview scheduling
 */

const mongoose = require('mongoose');
const { SCHEDULE_STATUS } = require('../config/constants');

const scheduleSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'User ID is required']
  },
  interviewer_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Interviewer'
  },
  date_time: { 
    type: Date,
    required: [true, 'Schedule date and time is required']
  },
  duration_minutes: {
    type: Number,
    default: 30,
    min: 15,
    max: 120
  },
  status: { 
    type: String, 
    enum: Object.values(SCHEDULE_STATUS),
    default: SCHEDULE_STATUS.PENDING
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, { 
  timestamps: true 
});

/**
 * Index for efficient date-based queries
 */
scheduleSchema.index({ user_id: 1, date_time: 1 });
scheduleSchema.index({ status: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
