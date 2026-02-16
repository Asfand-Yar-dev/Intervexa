/**
 * AnswerAnalysis Model
 * Stores AI analysis of answers (Architecture Doc Section 5.6)
 * 
 * This is a separate model from Answer to keep AI results decoupled.
 * One Answer has one AnswerAnalysis.
 */

const mongoose = require('mongoose');

const answerAnalysisSchema = new mongoose.Schema({
    answerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Answer',
        required: [true, 'Answer ID is required'],
        unique: true, // One analysis per answer
    },

    // === SCORE FIELDS (0-100) ===
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

    // === FEEDBACK FIELDS ===
    keywords: [{
        type: String,
        trim: true,
    }],
    strengths: [{
        type: String,
        trim: true,
    }],
    improvements: [{
        type: String,
        trim: true,
    }],
    detailedFeedback: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

/**
 * Note: answerId already has a unique index from the schema definition.
 * No additional schema.index() needed.
 */

module.exports = mongoose.model('AnswerAnalysis', answerAnalysisSchema);
