/**
 * Interview Routes
 * Handles interview session management
 */

const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const { HTTP_STATUS, SESSION_STATUS } = require('../config/constants');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { startInterviewValidation, userIdParamValidation } = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   POST /api/interviews/start
 * @desc    Start a new interview session
 * @access  Private
 */
router.post('/start', authenticate, startInterviewValidation, asyncHandler(async (req, res) => {
  const { session_type } = req.body;

  const session = new InterviewSession({
    user_id: req.user.id, // Get user from authenticated token
    session_type: session_type || 'general',
    status: SESSION_STATUS.ONGOING,
    started_at: new Date()
  });

  await session.save();

  logger.info(`Interview session started: ${session._id} for user: ${req.user.id}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Interview session started',
    data: session
  });
}));

/**
 * @route   GET /api/interviews/my-sessions
 * @desc    Get current user's interview sessions
 * @access  Private
 */
router.get('/my-sessions', authenticate, asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1 } = req.query;
  
  const query = { user_id: req.user.id };
  
  // Filter by status if provided
  if (status && Object.values(SESSION_STATUS).includes(status)) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const sessions = await InterviewSession.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await InterviewSession.countDocuments(query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      sessions,
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
 * @route   GET /api/interviews/:sessionId
 * @desc    Get a specific interview session
 * @access  Private
 */
router.get('/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id // Ensure user owns this session
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: session
  });
}));

/**
 * @route   PUT /api/interviews/:sessionId/end
 * @desc    End an interview session
 * @access  Private
 */
router.put('/:sessionId/end', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Session is already completed');
  }

  session.status = SESSION_STATUS.COMPLETED;
  session.ended_at = new Date();
  await session.save();

  logger.info(`Interview session ended: ${session._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session ended',
    data: session
  });
}));

/**
 * @route   PUT /api/interviews/:sessionId/cancel
 * @desc    Cancel an interview session
 * @access  Private
 */
router.put('/:sessionId/cancel', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot cancel a completed session');
  }

  session.status = SESSION_STATUS.CANCELLED;
  session.ended_at = new Date();
  await session.save();

  logger.info(`Interview session cancelled: ${session._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session cancelled',
    data: session
  });
}));

/**
 * @route   GET /api/interviews/user/:userId
 * @desc    Get interview sessions for a specific user (Admin only)
 * @access  Private (kept for backward compatibility)
 */
router.get('/user/:userId', authenticate, userIdParamValidation, asyncHandler(async (req, res) => {
  // For now, allow users to only see their own sessions
  // In future, add admin check: authorize(USER_ROLES.ADMIN)
  if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Access denied');
  }

  const sessions = await InterviewSession.find({
    user_id: req.params.userId
  }).sort({ createdAt: -1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: sessions
  });
}));

/**
 * @route   GET /api/interviews/:sessionId/results
 * @desc    Get interview results with aggregated feedback
 * @access  Private
 */
router.get('/:sessionId/results', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  // Get all answers for this session with question details
  const answers = await Answer.find({
    session_id: req.params.sessionId,
    user_id: req.user.id
  })
    .populate('question_id', 'questionText category difficulty')
    .sort({ createdAt: 1 });

  // Calculate scores from answers
  const answeredQuestions = answers.length;
  const totalScore = answers.reduce((sum, a) => sum + (a.evaluation_score || 0), 0);
  const averageScore = answeredQuestions > 0 ? Math.round(totalScore / answeredQuestions) : 0;

  // Build question feedback array
  const questionFeedback = answers.map((answer, index) => ({
    id: answer._id,
    questionNumber: index + 1,
    question: answer.question_id?.questionText || 'Question not found',
    category: answer.question_id?.category || 'General',
    difficulty: answer.question_id?.difficulty || 'Medium',
    answer: answer.answer_text,
    score: answer.evaluation_score || 0,
    feedback: answer.feedback || 'Answer recorded successfully. AI analysis pending.',
    strengths: [],  // Will be populated by AI analysis
    improvements: [],  // Will be populated by AI analysis
  }));

  // Build result response
  const results = {
    sessionId: session._id,
    status: session.status,
    sessionType: session.session_type,
    startedAt: session.started_at,
    completedAt: session.ended_at,
    duration: session.duration,
    
    // Scores
    overallScore: session.overall_score || averageScore,
    totalQuestions: session.total_questions || answeredQuestions,
    questionsAnswered: answeredQuestions,
    
    // Score breakdown (placeholder until AI integration)
    scores: {
      overall: session.overall_score || averageScore,
      confidence: 75,  // Placeholder - will come from AI vocal/facial analysis
      clarity: 80,     // Placeholder - will come from AI NLP analysis
      technical: averageScore,
      communication: 78,  // Placeholder
    },
    
    // Feedback
    questionFeedback,
    
    // Summary (placeholder)
    summary: answeredQuestions > 0 
      ? `You answered ${answeredQuestions} questions in this ${session.session_type || 'interview'} session. Keep practicing to improve your scores!`
      : 'No answers recorded for this session.',
    
    // Arrays for UI display (placeholder until AI)
    strengths: [
      'Clear articulation of answers',
      'Good technical foundation',
    ],
    improvements: [
      'Provide more specific examples',
      'Structure responses with STAR method',
    ],
  };

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: results
  });
}));

module.exports = router;

