/**
 * Answer Routes
 * Handles answer submission and retrieval
 * 
 * FIXES APPLIED:
 * - Fixed field name mismatch: all routes use camelCase (interviewId/userId/questionId)
 * - Fixed route ordering: /user/my-answers BEFORE /:answerId to prevent shadowing
 * - Added answer processing status polling endpoint
 */

const express = require('express');
const Answer = require('../models/Answer');
const InterviewSession = require('../models/InterviewSession');
const Question = require('../models/Question');
const { HTTP_STATUS } = require('../config/constants');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { submitAnswerValidation } = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

// =====================================================================
// STATIC ROUTES FIRST (must come before /:answerId param routes)
// =====================================================================

/**
 * @route   GET /api/answers/user/my-answers
 * @desc    Get all answers for the current user (paginated)
 * @access  Private
 * 
 * IMPORTANT: This route must be defined BEFORE /:answerId routes
 * otherwise Express will try to match "user" as an answerId param.
 */
router.get('/user/my-answers', authenticate, asyncHandler(async (req, res) => {
  const { limit = 20, page = 1 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const answers = await Answer.find({ userId: req.user.id })
    .populate('questionId', 'questionText category difficulty')
    .populate('interviewId', 'session_type status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Answer.countDocuments({ userId: req.user.id });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      answers,
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
 * @route   POST /api/answers/submit
 * @desc    Submit a text-based answer for a question
 * @access  Private
 */
router.post('/submit', authenticate, submitAnswerValidation, asyncHandler(async (req, res) => {
  const { questionId, interviewId, answerText, audioUrl, videoUrl } = req.body;

  // Verify the session exists and belongs to the user
  const session = await InterviewSession.findOne({
    _id: interviewId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found or access denied');
  }

  if (session.status === 'completed' || session.status === 'cancelled') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot submit answers to a closed session');
  }

  // Verify the question exists
  const question = await Question.findById(questionId);
  if (!question) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Question not found');
  }

  // Check for duplicate answer
  const existingAnswer = await Answer.findOne({
    questionId: questionId,
    interviewId: interviewId,
    userId: req.user.id
  });

  if (existingAnswer) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Answer already submitted for this question');
  }

  // Create answer record
  const answer = new Answer({
    userId: req.user.id,
    questionId: questionId,
    interviewId: interviewId,
    answerText: answerText,
    audioFileUrl: audioUrl,
  });

  await answer.save();

  // Update session answered questions count
  session.answered_questions = (session.answered_questions || 0) + 1;
  await session.save();

  logger.info(`Answer submitted: ${answer._id} for question: ${questionId}`);

  // Trigger AI evaluation asynchronously (non-blocking)
  triggerAIEvaluation(answer._id, {
    text: answerText,
    audioUrl: audioUrl,
    videoUrl: videoUrl,
  }).catch(err => {
    logger.error(`AI evaluation failed for answer ${answer._id}:`, err.message);
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Answer submitted successfully',
    data: answer
  });
}));

/**
 * Async function to trigger AI evaluation
 * Runs in background, doesn't block response
 */
async function triggerAIEvaluation(answerId, data) {
  try {
    const aiServices = require('../services');

    // Run analysis (uses placeholders if AI not configured)
    const analysis = await aiServices.analyzeAnswer(data);

    // Update answer with evaluation results
    if (analysis.overallScore != null) {
      await Answer.findByIdAndUpdate(answerId, {
        evaluationScore: analysis.overallScore,
        feedback: generateFeedbackText(analysis),
        processingStatus: 'completed',
        processedAt: new Date(),
      });

      logger.info(`AI evaluation completed for answer ${answerId}: score=${analysis.overallScore}`);
    }
  } catch (error) {
    logger.error('AI evaluation error:', error.message);
    await Answer.findByIdAndUpdate(answerId, { processingStatus: 'failed' })
      .catch(err => logger.error(`Failed to update answer status: ${err.message}`));
    throw error;
  }
}

/**
 * Generate feedback text from analysis results
 */
function generateFeedbackText(analysis) {
  const parts = [];

  if (analysis.nlp?.feedback?.summary) {
    parts.push(analysis.nlp.feedback.summary);
  }
  if (analysis.vocal?.feedback?.summary) {
    parts.push(analysis.vocal.feedback.summary);
  }
  if (analysis.facial?.feedback?.summary) {
    parts.push(analysis.facial.feedback.summary);
  }

  return parts.length > 0
    ? parts.join(' ')
    : 'Answer recorded. AI analysis pending.';
}

// =====================================================================
// SESSION-SPECIFIC ANSWER ROUTES
// =====================================================================

/**
 * @route   GET /api/answers/session/:sessionId
 * @desc    Get all answers for a session
 * @access  Private
 */
router.get('/session/:sessionId', authenticate, asyncHandler(async (req, res) => {
  // Verify the session belongs to the user
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found or access denied');
  }

  const answers = await Answer.find({
    interviewId: req.params.sessionId,
    userId: req.user.id
  })
    .populate('questionId', 'questionText category difficulty')
    .sort({ createdAt: 1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      interviewId: req.params.sessionId,
      totalAnswers: answers.length,
      answers
    }
  });
}));

// =====================================================================
// PARAM ROUTES (must come after static routes)
// =====================================================================

/**
 * @route   GET /api/answers/:answerId
 * @desc    Get a specific answer with evaluation
 * @access  Private
 */
router.get('/:answerId', authenticate, asyncHandler(async (req, res) => {
  const answer = await Answer.findOne({
    _id: req.params.answerId,
    userId: req.user.id
  })
    .populate('questionId', 'questionText category difficulty')
    .populate('interviewId', 'session_type status');

  if (!answer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Answer not found');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: answer
  });
}));

/**
 * @route   GET /api/answers/:answerId/status
 * @desc    Get processing status (for frontend polling)
 * @access  Private
 */
router.get('/:answerId/status', authenticate, asyncHandler(async (req, res) => {
  const answer = await Answer.findOne({
    _id: req.params.answerId,
    userId: req.user.id
  }).select('processingStatus transcription evaluationScore feedback processedAt');

  if (!answer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Answer not found');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      processingStatus: answer.processingStatus,
      transcription: answer.transcription,
      evaluationScore: answer.evaluationScore,
      feedback: answer.feedback,
      processedAt: answer.processedAt,
    }
  });
}));

/**
 * @route   PUT /api/answers/:answerId
 * @desc    Update an answer (only if session is still ongoing)
 * @access  Private
 */
router.put('/:answerId', authenticate, asyncHandler(async (req, res) => {
  const { answerText } = req.body;

  if (!answerText || !answerText.trim()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Answer text is required');
  }

  const answer = await Answer.findOne({
    _id: req.params.answerId,
    userId: req.user.id
  }).populate('interviewId');

  if (!answer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Answer not found');
  }

  if (answer.interviewId.status !== 'ongoing') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot update answer in a closed session');
  }

  answer.answerText = answerText.trim();
  await answer.save();

  logger.info(`Answer updated: ${answer._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Answer updated successfully',
    data: answer
  });
}));

module.exports = router;
