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

    // References
    interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewSession',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    // Percentage of video frames where a face was visible (0 = camera off, 100 = always on)
    facePresenceRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
    },

    overallScore: {
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

    // Raw payloads (for detailed report / debugging)
    nlpData: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    vocalData: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    facialData: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    analyzedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

/**
 * Note: answerId already has a unique index from the schema definition.
 * No additional schema.index() needed.
 */

module.exports = mongoose.model('AnswerAnalysis', answerAnalysisSchema);
