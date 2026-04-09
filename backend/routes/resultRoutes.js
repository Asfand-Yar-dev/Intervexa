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

    // NEW LOGIC: Always calculate dynamic results from individual answers to prevent stale zero-scores 
    // when AI processing finishes after the interview report was first generated.
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

    const results = await Promise.all(sessions.map(async (session) => {
        const answers = await Answer.find({ interviewId: session._id, userId: session.user_id });
        const answerIds = answers.map(a => a._id);
        const AnswerAnalysis = require('../models/AnswerAnalysis');
        const analyses = await AnswerAnalysis.find({ answerId: { $in: answerIds } });

        const completedCount = answers.filter(a => a.processingStatus === 'completed').length;
        
        const overallScoreFromAnswers = completedCount > 0 
            ? Math.round(answers.reduce((s, a) => s + (a.evaluationScore ?? 0), 0) / completedCount)
            : 0;

        // Calculate category averages
        const avgAnalysis = (field) => {
            const vals = analyses.map(an => an[field]).filter(v => v > 0);
            return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
        };

        return {
            sessionId: session._id,
            sessionType: session.session_type,
            jobTitle: session.jobTitle || 'Job Interview',
            difficulty: session.difficulty || 'medium',
            status: session.status,
            overallScore: session.overall_score || overallScoreFromAnswers,
            scores: {
                overall: overallScoreFromAnswers,
                technical: avgAnalysis('technicalScore'),
                confidence: avgAnalysis('confidenceScore'),
                clarity: avgAnalysis('clarityScore'),
            },
            questionsAnswered: answers.length,
            totalQuestions: session.total_questions || answers.length,
            startedAt: session.started_at,
            completedAt: session.ended_at,
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

    const answers = await Answer.find({ interviewId, userId });
    if (!answers.length) {
        logger.warn(`No answers for interview ${interviewId}, skipping result compilation`);
        return null;
    }

    const answerIds = answers.map((a) => a._id);
    const analyses = await AnswerAnalysis.find({ answerId: { $in: answerIds } });
    const byAnswerId = new Map(answers.map((a) => [a._id.toString(), a]));

    const scoredPairs = analyses
        .map((an) => ({ analysis: an, answer: byAnswerId.get(an.answerId.toString()) }))
        .filter(
            ({ answer }) =>
                answer &&
                answer.processingStatus === 'completed'
        );

    const completedAnswers = answers.filter((a) => a.processingStatus === 'completed');
    const overallFromEval =
        completedAnswers.length > 0
            ? Math.round(
                  completedAnswers.reduce((s, a) => s + (a.evaluationScore ?? 0), 0) /
                      completedAnswers.length
              )
            : 0;

    const avgField = (field) => {
        if (!scoredPairs.length) return 0;
        const vals = scoredPairs
            .map((p) => p.analysis[field])
            .filter((v) => v != null && !Number.isNaN(Number(v)));
        if (!vals.length) return 0;
        return Math.round(vals.reduce((s, v) => s + Number(v), 0) / vals.length);
    };

    const confidenceScore = avgField('confidenceScore');
    const clarityScore = avgField('clarityScore');
    const technicalScore = avgField('technicalScore');
    const bodyLanguageScore = avgField('bodyLanguageScore');
    const voiceToneScore = avgField('voiceToneScore');

    const strengths = [...new Set(scoredPairs.flatMap((p) => p.analysis.strengths || []))].slice(0, 5);
    const improvements = [...new Set(scoredPairs.flatMap((p) => p.analysis.improvements || []))].slice(0, 5);

    const label =
        overallFromEval >= 75 ? 'Strong' : overallFromEval >= 50 ? 'Average' : 'Needs improvement';
    const summary = scoredPairs.length
        ? `Interview completed with ${scoredPairs.length} fully evaluated answer(s). Overall: ${label}.`
        : 'Interview completed, but no answers met the minimum bar for scoring (speak clearly for a few seconds per question).';

    const result = await Result.findOneAndUpdate(
        { interviewId },
        {
            interviewId,
            userId,
            overallScore: overallFromEval,
            confidenceScore,
            clarityScore,
            technicalScore,
            bodyLanguageScore,
            voiceToneScore,
            totalQuestions: answers.length,
            questionsAnswered: completedAnswers.length,
            strengths: strengths.length ? strengths : ['Submit spoken answers for personalized strengths'],
            improvements: improvements.length
                ? improvements
                : ['Practice speaking full answers before retrying'],
            summary,
            generatedAt: new Date(),
        },
        { upsert: true, new: true }
    );

    await InterviewSession.findByIdAndUpdate(interviewId, { overall_score: overallFromEval }).catch(() => {});

    logger.info(`Result compiled for interview ${interviewId}: score=${result.overallScore}`);
    return result;
}

// Export router and helper function
module.exports = router;
module.exports.compileInterviewResult = compileInterviewResult;

