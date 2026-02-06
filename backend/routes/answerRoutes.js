/**
 * Answer Routes
 * Handles answer submission and retrieval
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

/**
 * @route   POST /api/answers/submit
 * @desc    Submit an answer for a question
 * @access  Private
 */
router.post('/submit', authenticate, submitAnswerValidation, asyncHandler(async (req, res) => {
  const { question_id, session_id, answer_text, audio_url, video_url } = req.body;

  // Verify the session exists and belongs to the user
  const session = await InterviewSession.findOne({
    _id: session_id,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found or access denied');
  }

  if (session.status === 'completed' || session.status === 'cancelled') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot submit answers to a closed session');
  }

  // Verify the question exists
  const question = await Question.findById(question_id);
  if (!question) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Question not found');
  }

  // Check if answer already exists for this question in this session
  const existingAnswer = await Answer.findOne({
    question_id,
    session_id,
    user_id: req.user.id
  });

  if (existingAnswer) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Answer already submitted for this question');
  }

  const answer = new Answer({
    user_id: req.user.id,
    question_id,
    session_id,
    answer_text,
    audio_url,
    video_url
  });

  await answer.save();

  // Update session answered questions count
  session.answered_questions = (session.answered_questions || 0) + 1;
  await session.save();

  logger.info(`Answer submitted: ${answer._id} for question: ${question_id}`);

  // Trigger AI evaluation asynchronously (non-blocking)
  // Import AI services - this runs in background and updates the answer when complete
  triggerAIEvaluation(answer._id, {
    text: answer_text,
    audioUrl: audio_url,
    videoUrl: video_url,
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
        evaluation_score: analysis.overallScore,
        feedback: generateFeedbackText(analysis),
      });
      
      logger.info(`AI evaluation completed for answer ${answerId}: score=${analysis.overallScore}`);
    }
  } catch (error) {
    logger.error('AI evaluation error:', error.message);
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
    session_id: req.params.sessionId,
    user_id: req.user.id
  })
    .populate('question_id', 'questionText category difficulty')
    .sort({ createdAt: 1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      session_id: req.params.sessionId,
      total_answers: answers.length,
      answers
    }
  });
}));

/**
 * @route   GET /api/answers/:answerId
 * @desc    Get a specific answer with evaluation
 * @access  Private
 */
router.get('/:answerId', authenticate, asyncHandler(async (req, res) => {
  const answer = await Answer.findOne({
    _id: req.params.answerId,
    user_id: req.user.id
  })
    .populate('question_id', 'questionText category difficulty')
    .populate('session_id', 'session_type status');

  if (!answer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Answer not found');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: answer
  });
}));

/**
 * @route   PUT /api/answers/:answerId
 * @desc    Update an answer (only if session is still ongoing)
 * @access  Private
 */
router.put('/:answerId', authenticate, asyncHandler(async (req, res) => {
  const { answer_text } = req.body;

  if (!answer_text || !answer_text.trim()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Answer text is required');
  }

  const answer = await Answer.findOne({
    _id: req.params.answerId,
    user_id: req.user.id
  }).populate('session_id');

  if (!answer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Answer not found');
  }

  if (answer.session_id.status !== 'ongoing') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot update answer in a closed session');
  }

  answer.answer_text = answer_text.trim();
  await answer.save();

  logger.info(`Answer updated: ${answer._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Answer updated successfully',
    data: answer
  });
}));

/**
 * @route   GET /api/answers/my-answers
 * @desc    Get all answers for the current user
 * @access  Private
 */
router.get('/user/my-answers', authenticate, asyncHandler(async (req, res) => {
  const { limit = 20, page = 1 } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const answers = await Answer.find({ user_id: req.user.id })
    .populate('question_id', 'questionText category difficulty')
    .populate('session_id', 'session_type status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Answer.countDocuments({ user_id: req.user.id });

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

module.exports = router;
