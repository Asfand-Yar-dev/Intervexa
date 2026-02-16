/**
 * Result Model
 * Compiled interview results (Architecture Doc Section 5.7)
 * 
 * Aggregates all AnswerAnalysis scores into a final result.
 * One Interview has one Result.
 */

const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewSession',
        required: [true, 'Interview ID is required'],
        unique: true, // One result per interview
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },

    // === AGGREGATED SCORES (0-100) ===
    overallScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    confidenceScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    clarityScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    technicalScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    bodyLanguageScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    voiceToneScore: {
        type: Number,
        min: 0,
        max: 100,
    },

    // === QUESTION STATS ===
    totalQuestions: {
        type: Number,
        default: 0,
    },
    questionsAnswered: {
        type: Number,
        default: 0,
    },

    // === FEEDBACK ===
    strengths: [{
        type: String,
        trim: true,
    }],
    improvements: [{
        type: String,
        trim: true,
    }],
    summary: {
        type: String,
        trim: true,
    },

    // === TIMESTAMPS ===
    generatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

/**
 * Indexes
 * Note: interviewId already has a unique index from the schema definition.
 */
resultSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Result', resultSchema);
