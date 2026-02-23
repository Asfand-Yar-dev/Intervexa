/**
 * Payment Details Model
 * Payment transaction records
 */

const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../config/constants');

const paymentSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'User ID is required']
  },
  amount: { 
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  method: { 
    type: String,
    enum: ['card', 'paypal', 'bank_transfer', 'other'],
    required: [true, 'Payment method is required']
  },
  status: { 
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  transaction_id: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

/**
 * Index for payment queries
 */
paymentSchema.index({ user_id: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentDetails', paymentSchema);
