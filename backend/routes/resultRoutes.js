/**
 * =============================================================================
 * RESULT ROUTES
 * =============================================================================
 * 
 * Endpoints for viewing compiled interview results and history.
 * 
 * ENDPOINTS:
 *   GET /api/results            - Get all user results (paginated)
 *   GET /api/results/:resultId  - Get specific result details
 * 
 * ARCHITECTURE DOC: Section 4.5 - Result endpoints
 * =============================================================================
 */

const express = require('express');
const Result = require('../models/Result');
const InterviewSession = require('../models/InterviewSession');
const Answer = require('../models/Answer');
const { HTTP_STATUS } = require('../config/constants');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/results
 * @desc    Get all interview results for the current user
 * @access  Private
 * 
 * Supports pagination via ?page=1&limit=10
 * Supports filtering by ?session_type=technical
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { limit = 10, page = 1, session_type } = req.query;
    const userId = req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // First check if there are compiled Result documents
    const resultQuery = { userId };
    const resultCount = await Result.countDocuments(resultQuery);

    if (resultCount > 0) {
        // Return from the Result model (compiled results)
        const results = await Result.find(resultQuery)
            .populate('interviewId', 'session_type jobTitle difficulty started_at ended_at duration')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            data: {
                results,
                pagination: {
                    total: resultCount,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(resultCount / parseInt(limit))
                }
            }
        });
    }

    // Fallback: build results from completed InterviewSessions
    const sessionQuery = {
        user_id: userId,
        status: 'completed',
    };
    if (session_type) {
        sessionQuery.session_type = session_type;
    }

    const total = await InterviewSession.countDocuments(sessionQuery);

    const sessions = await InterviewSession.find(sessionQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    // For each session, get the answer count and average score
    const results = await Promise.all(sessions.map(async (session) => {
        const answerStats = await Answer.aggregate([
            { $match: { interviewId: session._id, userId: session.user_id } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    avgScore: { $avg: { $ifNull: ['$evaluationScore', 0] } }
                }
            }
        ]);

        const stats = answerStats[0] || { count: 0, avgScore: 0 };

        return {
            sessionId: session._id,
            sessionType: session.session_type,
            jobTitle: session.jobTitle || '',
            difficulty: session.difficulty || 'medium',
            status: session.status,
            overallScore: session.overall_score || Math.round(stats.avgScore),
            questionsAnswered: stats.count,
            totalQuestions: session.total_questions || stats.count,
            startedAt: session.started_at,
            completedAt: session.ended_at,
            duration: session.duration,
            createdAt: session.createdAt,
        };
    }));

    res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
            results,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        }
    });
}));

/**
 * @route   GET /api/results/:resultId
 * @desc    Get a specific compiled result
 * @access  Private
 */
router.get('/:resultId', authenticate, asyncHandler(async (req, res) => {
    const result = await Result.findOne({
        _id: req.params.resultId,
        userId: req.user.id
    })
        .populate('interviewId', 'session_type jobTitle difficulty started_at ended_at duration skills')
        .populate('answerAnalyses');

    if (!result) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Result not found');
    }

    res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
    });
}));

// =====================================================================
// PHASE 5: DETAILED REPORT (Architecture Doc Section 4.6)
// =====================================================================

/**
 * @route   GET /api/results/:resultId/report
 * @desc    Get detailed PDF report for an interview result
 * @access  Private
 * 
 * PHASE 5: When implemented, this will generate a PDF report
 * containing detailed AI analysis, scores, and recommendations.
 * 
 * Libraries to use: PDFKit, Puppeteer, or html-pdf
 */
router.get('/:resultId/report', authenticate, asyncHandler(async (req, res) => {
    const result = await Result.findOne({
        _id: req.params.resultId,
        userId: req.user.id
    });

    if (!result) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Result not found');
    }

    // -----------------------------------------------------------------
    // PHASE 5: Generate PDF report here
    // -----------------------------------------------------------------
    // const PDFDocument = require('pdfkit');
    // const doc = new PDFDocument();
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', `attachment; filename=report-${result._id}.pdf`);
    // doc.pipe(res);
    // ... build PDF content from result data ...
    // doc.end();
    // -----------------------------------------------------------------

    // Placeholder response until Phase 5 is active
    res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'PDF report generation is not yet active (Phase 5).',
        data: {
            resultId: result._id,
            overallScore: result.overallScore,
            phase5Required: true,
            instructions: 'PDF report generation will be available when Phase 5 AI integration is complete.',
        }
    });
}));

// =====================================================================
// PHASE 5: RESULT COMPILATION HELPER
// =====================================================================

/**
 * Compile all AnswerAnalysis data into a single Result document.
 * Called automatically when an interview ends (after AI processing completes).
 * 
 * USAGE (from interviewRoutes.js end endpoint):
 *   const { compileInterviewResult } = require('./resultRoutes');
 *   await compileInterviewResult(sessionId, userId);
 * 
 * @param {string} interviewId - The interview session ID
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} The compiled Result document
 */
async function compileInterviewResult(interviewId, userId) {
    const AnswerAnalysis = require('../models/AnswerAnalysis');
    const logger = require('../config/logger');

    // Get all answers for this interview
    const answers = await Answer.find({ interviewId, userId });
    const answerIds = answers.map(a => a._id);

    // Get all analyses
    const analyses = await AnswerAnalysis.find({ answerId: { $in: answerIds } });

    if (analyses.length === 0) {
        logger.warn(`No analyses found for interview ${interviewId}, skipping result compilation`);
        return null;
    }

    // Compute averages
    const avg = (arr, field) => {
        const vals = arr.map(a => a[field]).filter(v => v != null);
        return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
    };

    const overallScore = avg(analyses, 'confidenceScore'); // Could be weighted average
    const confidenceScore = avg(analyses, 'confidenceScore');
    const clarityScore = avg(analyses, 'clarityScore');
    const technicalScore = avg(analyses, 'technicalScore');
    const bodyLanguageScore = avg(analyses, 'bodyLanguageScore');
    const voiceToneScore = avg(analyses, 'voiceToneScore');

    // Collect all strengths/improvements
    const strengths = [...new Set(analyses.flatMap(a => a.strengths || []))].slice(0, 5);
    const improvements = [...new Set(analyses.flatMap(a => a.improvements || []))].slice(0, 5);

    // Upsert the Result
    const result = await Result.findOneAndUpdate(
        { interviewId },
        {
            interviewId,
            userId,
            overallScore: Math.round((confidenceScore + clarityScore + technicalScore) / 3),
            confidenceScore,
            clarityScore,
            technicalScore,
            bodyLanguageScore,
            voiceToneScore,
            totalQuestions: answers.length,
            questionsAnswered: analyses.length,
            strengths,
            improvements,
            summary: `Interview completed with ${analyses.length} analyzed answers. Overall performance: ${overallScore >= 75 ? 'Strong' : overallScore >= 50 ? 'Average' : 'Needs improvement'}.`,
            generatedAt: new Date(),
        },
        { upsert: true, new: true }
    );

    logger.info(`Result compiled for interview ${interviewId}: score=${result.overallScore}`);
    return result;
}

// Export router and helper function
module.exports = router;
module.exports.compileInterviewResult = compileInterviewResult;

