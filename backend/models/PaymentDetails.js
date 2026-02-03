const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number },
  method: { type: String },
  status: { type: String },
  ended_at: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("PaymentDetails", paymentSchema);
