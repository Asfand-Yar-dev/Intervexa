/**
 * InterviewQuestion Model (Join Table)
 * Links questions to specific interviews (Architecture Doc Section 5.4)
 * 
 * Tracks question order and answer status within an interview.
 */

const mongoose = require('mongoose');

const interviewQuestionSchema = new mongoose.Schema({
    interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewSession',
        required: [true, 'Interview ID is required'],
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: [true, 'Question ID is required'],
    },
    order: {
        type: Number,
        required: [true, 'Question order is required'],
        min: 1,
    },
    status: {
        type: String,
        enum: ['pending', 'answered', 'skipped'],
        default: 'pending',
    },
}, {
    timestamps: true,
});

/**
 * Compound unique index: one question per interview
 */
interviewQuestionSchema.index({ interviewId: 1, questionId: 1 }, { unique: true });
interviewQuestionSchema.index({ interviewId: 1, order: 1 });

module.exports = mongoose.model('InterviewQuestion', interviewQuestionSchema);
