/**
 * Profile Model
 * Extended user profile information
 */

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true
  },
  profile_picture: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  phone: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  linkedin_url: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience_years: {
    type: Number,
    min: 0,
    max: 50
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Profile', profileSchema);