/**
 * =============================================================================
 * INTERVIEW ROUTES
 * =============================================================================
 * 
 * Handles interview session management and answer uploads.
 * 
 * ENDPOINTS:
 *   POST   /api/interviews/start              - Start new interview
 *   GET    /api/interviews/my-sessions         - List user's interviews (paginated)
 *   GET    /api/interviews/:sessionId          - Get specific interview
 *   PATCH  /api/interviews/:sessionId          - Update interview session  
 *   DELETE /api/interviews/:sessionId          - Delete interview session
 *   POST   /api/interviews/:sessionId/answers  - Submit audio answer
 *   GET    /api/interviews/:sessionId/answers  - Get answers for session
 *   GET    /api/interviews/:sessionId/questions - Get questions for session
 *   PUT    /api/interviews/:sessionId/end      - End interview
 *   PUT    /api/interviews/:sessionId/cancel   - Cancel interview
 *   GET    /api/interviews/:sessionId/results  - Get results with feedback
 *   GET    /api/interviews/user/:userId        - Admin: get user's sessions
 * 
 * @version 2.0.0 (Architecture aligned — all missing endpoints added)
 * =============================================================================
 */

const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const InterviewQuestion = require('../models/InterviewQuestion');
const Answer = require('../models/Answer');
const AnswerAnalysis = require('../models/AnswerAnalysis');
const Question = require('../models/Question');
const { HTTP_STATUS, SESSION_STATUS } = require('../config/constants');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { startInterviewValidation, userIdParamValidation } = require('../middleware/validation');
const logger = require('../config/logger');

// Phase 4 imports
const upload = require('../middleware/uploadMiddleware');
const { submitAnswer, getAnswers } = require('../controllers/answerController');

// Phase 5 imports (AI services — activate when AI microservice is ready)
// const aiServiceClient = require('../services/aiServiceClient');

const router = express.Router();

/**
 * @route   POST /api/interviews/start
 * @desc    Start a new interview session
 * @access  Private
 */
router.post('/start', authenticate, startInterviewValidation, asyncHandler(async (req, res) => {
  const { session_type, jobTitle, skills, jobDescription, difficulty } = req.body;

  const session = new InterviewSession({
    user_id: req.user.id,
    session_type: session_type || 'general',
    jobTitle: jobTitle || '',
    skills: skills || [],
    jobDescription: jobDescription || '',
    difficulty: difficulty || 'medium',
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
 * @desc    Get current user's interview sessions (paginated)
 * @access  Private
 */
router.get('/my-sessions', authenticate, asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1 } = req.query;

  const query = { user_id: req.user.id };

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
    user_id: req.user.id
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
 * @route   PATCH /api/interviews/:sessionId
 * @desc    Update an interview session (e.g., jobTitle, skills, difficulty)
 * @access  Private
 * 
 * ARCHITECTURE DOC: PATCH /api/interviews/:id
 */
router.patch('/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  // Only allow updates on non-completed sessions
  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot update a completed session');
  }

  // Allowed updateable fields
  const { session_type, jobTitle, skills, jobDescription, difficulty } = req.body;

  if (session_type) session.session_type = session_type;
  if (jobTitle !== undefined) session.jobTitle = jobTitle;
  if (skills !== undefined) session.skills = skills;
  if (jobDescription !== undefined) session.jobDescription = jobDescription;
  if (difficulty) session.difficulty = difficulty;

  await session.save();

  logger.info(`Interview session updated: ${session._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session updated',
    data: session
  });
}));

/**
 * @route   DELETE /api/interviews/:sessionId
 * @desc    Delete an interview session
 * @access  Private
 * 
 * ARCHITECTURE DOC: DELETE /api/interviews/:id
 */
router.delete('/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  // Don't allow deleting ongoing sessions — must cancel first
  if (session.status === SESSION_STATUS.ONGOING) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot delete an ongoing session. Cancel it first.');
  }

  // IMPORTANT: Collect answer IDs BEFORE deleting answers (for AnswerAnalysis cascade)
  const answerIds = await Answer.find({ interviewId: req.params.sessionId }).distinct('_id');

  // Delete in correct order: analyses → answers → questions → session
  if (answerIds.length > 0) {
    await AnswerAnalysis.deleteMany({ answerId: { $in: answerIds } });
  }
  await Answer.deleteMany({ interviewId: req.params.sessionId });
  await InterviewQuestion.deleteMany({ interviewId: req.params.sessionId });
  await InterviewSession.deleteOne({ _id: req.params.sessionId });

  logger.info(`Interview session deleted: ${req.params.sessionId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session and associated data deleted successfully'
  });
}));

// =====================================================================
// PHASE 4: ANSWER UPLOAD ROUTES
// =====================================================================

/**
 * @route   POST /api/interviews/:sessionId/answers
 * @desc    Submit an audio answer for a specific question in this session
 * @access  Private
 */
router.post('/:sessionId/answers', authenticate, upload.single('audio'), asyncHandler(submitAnswer));

/**
 * @route   GET /api/interviews/:sessionId/answers
 * @desc    Get all answers submitted for this session
 * @access  Private
 */
router.get('/:sessionId/answers', authenticate, asyncHandler(getAnswers));

// =====================================================================
// INTERVIEW QUESTION MANAGEMENT
// =====================================================================

/**
 * @route   GET /api/interviews/:sessionId/questions
 * @desc    Get questions assigned to this interview session
 * @access  Private
 * 
 * ARCHITECTURE DOC: GET /api/interviews/:id/questions
 */
router.get('/:sessionId/questions', authenticate, asyncHandler(async (req, res) => {
  // Verify session belongs to user
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  // Get questions linked to this interview via the join table
  const interviewQuestions = await InterviewQuestion.find({
    interviewId: req.params.sessionId
  })
    .populate('questionId', 'questionText category difficulty skills timeLimit keywords')
    .sort({ order: 1 });

  const questions = interviewQuestions.map(iq => ({
    id: iq.questionId?._id,
    order: iq.order,
    status: iq.status,
    questionText: iq.questionId?.questionText,
    category: iq.questionId?.category,
    difficulty: iq.questionId?.difficulty,
    skills: iq.questionId?.skills,
    timeLimit: iq.questionId?.timeLimit,
  }));

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      sessionId: session._id,
      totalQuestions: questions.length,
      questions
    }
  });
}));

// =====================================================================
// SESSION LIFECYCLE
// =====================================================================

/**
 * @route   PUT /api/interviews/:sessionId/end
 * @desc    End/complete an interview session
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
  await session.save(); // pre-save hook auto-calculates duration

  // =========================================================================
  // PHASE 5: Trigger Result Compilation (activate when AI service is ready)
  // =========================================================================
  // When the AI microservice is integrated, uncomment to auto-compile results
  // after an interview ends. This aggregates all AnswerAnalysis records into
  // a single Result document.
  //
  // compileInterviewResult(session._id, req.user.id).catch(err => {
  //   logger.error(`Result compilation failed for session ${session._id}: ${err.message}`);
  // });
  // =========================================================================

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
 * @access  Private
 */
router.get('/user/:userId', authenticate, userIdParamValidation, asyncHandler(async (req, res) => {
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

// =====================================================================
// RESULTS
// =====================================================================

/**
 * @route   GET /api/interviews/:sessionId/results
 * @desc    Get interview results with aggregated feedback
 * @access  Private
 * 
 * FIX: Removed hardcoded scores (confidence: 75, clarity: 80, etc.)
 * Now computes scores dynamically from AnswerAnalysis data when available.
 */
router.get('/:sessionId/results', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  const answers = await Answer.find({
    interviewId: req.params.sessionId,
    userId: req.user.id
  })
    .populate('questionId', 'questionText category difficulty')
    .sort({ createdAt: 1 });

  const answeredQuestions = answers.length;
  const totalScore = answers.reduce((sum, a) => sum + (a.evaluationScore || 0), 0);
  const averageScore = answeredQuestions > 0 ? Math.round(totalScore / answeredQuestions) : 0;

  // Try to get detailed analysis scores from AnswerAnalysis model
  const answerIds = answers.map(a => a._id);
  const analyses = await AnswerAnalysis.find({ answerId: { $in: answerIds } });

  // Calculate aggregated category scores from analyses (if available)
  let confidenceAvg = 0, clarityAvg = 0, technicalAvg = 0, bodyLanguageAvg = 0, voiceToneAvg = 0;
  if (analyses.length > 0) {
    confidenceAvg = Math.round(analyses.reduce((s, a) => s + (a.confidenceScore || 0), 0) / analyses.length);
    clarityAvg = Math.round(analyses.reduce((s, a) => s + (a.clarityScore || 0), 0) / analyses.length);
    technicalAvg = Math.round(analyses.reduce((s, a) => s + (a.technicalScore || 0), 0) / analyses.length);
    bodyLanguageAvg = Math.round(analyses.reduce((s, a) => s + (a.bodyLanguageScore || 0), 0) / analyses.length);
    voiceToneAvg = Math.round(analyses.reduce((s, a) => s + (a.voiceToneScore || 0), 0) / analyses.length);
  }

  // Collect all strengths and improvements from analyses
  const allStrengths = [...new Set(analyses.flatMap(a => a.strengths || []))];
  const allImprovements = [...new Set(analyses.flatMap(a => a.improvements || []))];

  const questionFeedback = answers.map((answer, index) => {
    const analysis = analyses.find(a => a.answerId.toString() === answer._id.toString());
    return {
      id: answer._id,
      questionNumber: index + 1,
      question: answer.questionId?.questionText || 'Question not found',
      category: answer.questionId?.category || 'General',
      difficulty: answer.questionId?.difficulty || 'Medium',
      answer: answer.answerText,
      score: answer.evaluationScore || 0,
      feedback: answer.feedback || 'Answer recorded successfully. AI analysis pending.',
      strengths: analysis?.strengths || [],
      improvements: analysis?.improvements || [],
    };
  });

  const results = {
    sessionId: session._id,
    status: session.status,
    sessionType: session.session_type,
    jobTitle: session.jobTitle,
    difficulty: session.difficulty,
    startedAt: session.started_at,
    completedAt: session.ended_at,
    duration: session.duration,
    overallScore: session.overall_score || averageScore,
    totalQuestions: session.total_questions || answeredQuestions,
    questionsAnswered: answeredQuestions,
    scores: {
      overall: session.overall_score || averageScore,
      confidence: confidenceAvg || averageScore,
      clarity: clarityAvg || averageScore,
      technical: technicalAvg || averageScore,
      bodyLanguage: bodyLanguageAvg || 0,
      voiceTone: voiceToneAvg || 0,
    },
    questionFeedback,
    summary: answeredQuestions > 0
      ? `You answered ${answeredQuestions} questions in this ${session.session_type || 'interview'} session. Keep practicing to improve your scores!`
      : 'No answers recorded for this session.',
    strengths: allStrengths.length > 0 ? allStrengths : ['Complete more interviews for personalized feedback'],
    improvements: allImprovements.length > 0 ? allImprovements : ['Complete more interviews for personalized feedback'],
  };

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: results
  });
}));

module.exports = router;